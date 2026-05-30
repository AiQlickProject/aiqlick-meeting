import { JITSI_BRANDING } from "@/lib/branding";

import type {
  AvailableDevices,
  ChatMessage,
  CreateJitsiEmbedArgs,
  JitsiCommandName,
  JitsiEmbedHandle,
  MediaDevice,
  ParticipantInfo,
  ReactionEvent,
  ReactionKind,
  SelectedDevices,
  TranscriptChunk,
} from "./jitsi-types";
import { EMPTY_SELECTED_DEVICES } from "./jitsi-types";

const TRANSCRIPT_MAX_CHUNKS = 1000;
const CHAT_MAX_MESSAGES = 500;
const REACTION_TTL_MS = 3500;

/**
 * Payload we broadcast over Jitsi's endpoint text-message channel so
 * every participant's ReactionsOverlay can render the reaction with
 * the sender's name. Jitsi's built-in `sendReaction` doesn't surface
 * the reactor's display name through the IFrame API, so we add a
 * thin sidecar message ourselves.
 */
interface AiqlickReactionPayload {
  type: "aiqlick-reaction";
  kind: ReactionKind;
  senderName: string;
}

export interface CreateJitsiEmbedWebArgs extends CreateJitsiEmbedArgs {
  container: HTMLElement;
}

/**
 * Web implementation — loads `external_api.js` from the Jitsi
 * deployment, instantiates `JitsiMeetExternalAPI` inside the
 * container element handed to `attach()`, and wires its events to
 * the shared `onStateChange` callback.
 *
 * Browsers only — Metro resolves this file when bundling for web
 * because of the `.web.ts` suffix. The native build picks
 * `jitsi-embed.ts` instead, which uses `@jitsi/react-native-sdk`.
 */

interface JitsiMeetExternalAPI {
  dispose: () => void;
  executeCommand: (name: string, ...args: unknown[]) => void;
  addListener: (event: string, handler: (...args: unknown[]) => void) => void;
  getParticipantsInfo?: () => Array<{
    participantId: string;
    displayName?: string;
    formattedDisplayName?: string;
  }>;
  getNumberOfParticipants?: () => number;
  getAvailableDevices?: () => Promise<{
    audioInput?: Array<{ deviceId: string; label: string; groupId?: string }>;
    audioOutput?: Array<{ deviceId: string; label: string; groupId?: string }>;
    videoInput?: Array<{ deviceId: string; label: string; groupId?: string }>;
  }>;
  getCurrentDevices?: () => Promise<{
    audioInput?: { deviceId?: string; label?: string };
    audioOutput?: { deviceId?: string; label?: string };
    videoInput?: { deviceId?: string; label?: string };
  }>;
  myUserId?: () => string;
}

type JitsiMeetExternalAPICtor = new (
  domain: string,
  options: {
    roomName: string;
    parentNode: HTMLElement;
    width?: string;
    height?: string;
    jwt?: string;
    userInfo?: { displayName?: string };
    configOverwrite?: Record<string, unknown>;
    interfaceConfigOverwrite?: Record<string, unknown>;
  },
) => JitsiMeetExternalAPI;

declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiMeetExternalAPICtor;
  }
}

let loaderPromise: Promise<JitsiMeetExternalAPICtor> | null = null;
function loadExternalApi(domain: string): Promise<JitsiMeetExternalAPICtor> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Jitsi external_api can only load in a browser"));
  }
  if (window.JitsiMeetExternalAPI) return Promise.resolve(window.JitsiMeetExternalAPI);
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    // Add a cache-busting timestamp to ensure we don't load a stale script
    // after server configuration changes.
    s.src = `https://${domain}/external_api.js?v=${Date.now()}`;
    s.async = true;
    s.onload = () =>
      window.JitsiMeetExternalAPI
        ? resolve(window.JitsiMeetExternalAPI)
        : reject(new Error("external_api.js loaded but JitsiMeetExternalAPI is undefined"));
    s.onerror = () => {
      loaderPromise = null;
      reject(new Error(`Failed to load external_api.js from ${domain}`));
    };
    document.head.appendChild(s);
  });
  return loaderPromise;
}

function normalizeDevice(
  raw: { deviceId: string; label: string; groupId?: string },
  kind: MediaDevice["kind"],
): MediaDevice {
  return {
    deviceId: raw.deviceId,
    label: raw.label || "Unknown device",
    kind,
    groupId: raw.groupId,
  };
}

export function createJitsiEmbed(args: CreateJitsiEmbedWebArgs): JitsiEmbedHandle {
  let api: JitsiMeetExternalAPI | null = null;
  let disposed = false;
  let isJoined = false;
  let isTranscribing = false;
  let areCaptionsVisible = false;
  let isBlurEnabled = false;
  let isNoiseSuppressionOn = false;
  const transcriptionTimers: Array<ReturnType<typeof setTimeout>> = [];
  const parent = args.container;
  const clearTranscriptionTimers = () => {
    transcriptionTimers.splice(0).forEach(clearTimeout);
  };

  // Ordered chunks keyed by Jitsi's messageID so partial updates
  // (stable/unstable) replace earlier versions in place instead of
  // appending duplicates. A Map preserves insertion order.
  const transcriptChunks = new Map<string, TranscriptChunk>();
  const emitTranscripts = () => {
    args.onStateChange({ transcripts: Array.from(transcriptChunks.values()) });
  };

  // Mutable chat log + reactions buffer. Both are mirrored into
  // JitsiState via onStateChange whenever they change so the React UI
  // can render them. We keep the authoritative copy here so the
  // listener handlers don't need to read back through React state.
  const chatLog: ChatMessage[] = [];
  const reactionBuffer: ReactionEvent[] = [];
  let unreadChat = 0;

  // Local participant identity. Captured at videoConferenceJoined
  // and kept fresh on displayNameChange so reaction broadcasts and
  // outgoing chat messages know who "we" are.
  let localId: string | null = null;
  let localName: string = args.displayName?.trim() || "You";

  const emitChat = () => {
    args.onStateChange({
      chatMessages: chatLog.slice(),
      unreadChatCount: unreadChat,
    });
  };

  const emitReactions = () => {
    args.onStateChange({ recentReactions: reactionBuffer.slice() });
  };

  const pushReaction = (
    senderId: string,
    senderName: string,
    kind: ReactionKind,
  ) => {
    const ev: ReactionEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      senderId,
      senderName,
      kind,
      timestamp: Date.now(),
    };
    reactionBuffer.push(ev);
    emitReactions();
    // The overlay also calls dismissReaction once its CSS animation
    // ends. The hard timer here is the floor — if the overlay never
    // mounts (e.g. side panel covers the stage) the buffer still
    // drains cleanly.
    setTimeout(() => {
      const i = reactionBuffer.findIndex((r) => r.id === ev.id);
      if (i >= 0) {
        reactionBuffer.splice(i, 1);
        emitReactions();
      }
    }, REACTION_TTL_MS);
  };

  const pushChatMessage = (
    senderId: string,
    senderName: string,
    text: string,
    isOwn: boolean,
    isPrivate: boolean,
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // Dedup defence: in dev (React StrictMode double-mount) and in
    // some Jitsi versions the same message can arrive twice in quick
    // succession — once via outgoingMessage and once echoed back via
    // incomingMessage, or both listeners firing. If the previous
    // entry is byte-identical and landed within 1.5s, skip the
    // duplicate so the bubble doesn't render twice.
    const now = Date.now();
    const last = chatLog[chatLog.length - 1];
    if (
      last &&
      last.text === trimmed &&
      last.senderId === senderId &&
      last.isOwn === isOwn &&
      now - last.timestamp < 1500
    ) {
      return;
    }
    const msg: ChatMessage = {
      id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
      senderId,
      senderName,
      text: trimmed,
      timestamp: now,
      isOwn,
      isPrivate,
    };
    chatLog.push(msg);
    while (chatLog.length > CHAT_MAX_MESSAGES) chatLog.shift();
    // Own messages never bump unread. Incoming messages always do —
    // the React layer fires markChatRead when the panel opens, which
    // clears the counter.
    if (!isOwn) unreadChat = Math.min(99, unreadChat + 1);
    emitChat();
  };

  const setCaptions = (visible: boolean) => {
    // setSubtitles(enabled, displaySubtitles, language) — Jigasi only
    // streams transcripts while `enabled` is true; `displaySubtitles`
    // controls whether Jitsi renders the caption overlay on top of the
    // video. We separate the two flags so the transcript panel can keep
    // receiving chunks while the user hides the on-video overlay.
    api?.executeCommand("setSubtitles", true, visible, "en-US");
    areCaptionsVisible = visible;
    args.onStateChange({ areCaptionsVisible: visible });
  };

  const refreshDevices = async () => {
    if (!api?.getAvailableDevices) return;
    try {
      const avail = await api.getAvailableDevices();
      const devices: AvailableDevices = {
        audioInput: (avail?.audioInput ?? []).map((d) => normalizeDevice(d, "audioinput")),
        audioOutput: (avail?.audioOutput ?? []).map((d) => normalizeDevice(d, "audiooutput")),
        videoInput: (avail?.videoInput ?? []).map((d) => normalizeDevice(d, "videoinput")),
      };
      const selected: SelectedDevices = { ...EMPTY_SELECTED_DEVICES };
      if (api.getCurrentDevices) {
        try {
          const cur = await api.getCurrentDevices();
          selected.audioInput = cur?.audioInput?.deviceId ?? null;
          selected.audioOutput = cur?.audioOutput?.deviceId ?? null;
          selected.videoInput = cur?.videoInput?.deviceId ?? null;
        } catch {
          /* ignore — selection stays null and the menu shows no checkmark */
        }
      }
      args.onStateChange({ availableDevices: devices, selectedDevices: selected });
    } catch {
      /* ignore */
    }
  };

  const init = () => {
    if (disposed || api) return;
    loadExternalApi(args.domain)
      .then((Ctor) => {
        if (disposed) return;
        api = new Ctor(args.domain, {
          roomName: args.roomName,
          parentNode: parent,
          width: "100%",
          height: "100%",
          jwt: args.jwt ?? undefined,
          userInfo: args.displayName ? { displayName: args.displayName } : undefined,
          configOverwrite: {
            toolbarButtons: [],
            prejoinPageEnabled: false,
            prejoinConfig: { enabled: false },
            disableDeepLinking: true,
            hideConferenceSubject: true,
            hideConferenceTimer: true,
            hideParticipantsStats: true,
            startInTileView: true,
            // Standard selfie mirror: when the user raises their right
            // hand it appears on the right side of their self-view, the
            // way Teams / Meet / Zoom render it. Forced via
            // configOverwrite so it wins over any persisted
            // `localFlipX: false` left over in returning users'
            // localStorage from when we briefly shipped no-mirror.
            localFlipX: true,
            transcription: {
              enabled: true,
              autoStartTranscription: true,
              autoCaptionOnTranscribe: true,
              disableStartForAll: false,
            },
            notifications: [],
            disableThirdPartyRequests: true,
            enableClosePage: false,
            disableProfile: true,
            // Reactions are surfaced through our own popover — keep
            // Jitsi's runtime support on so `sendReaction` works.
            disableReactions: false,
            disablePolls: true,
            participantsPane: { enabled: false },
            breakoutRooms: {
              hideAddRoomButton: true,
              hideAutoAssignButton: true,
              hideJoinRoomButton: true,
            },
          },
          interfaceConfigOverwrite: {
            ...JITSI_BRANDING,
            TOOLBAR_BUTTONS: [],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_CHROME_EXTENSION_BANNER: false,
            SHOW_POWERED_BY: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            HIDE_INVITE_MORE_HEADER: true,
          },
        });

        const ensureTranscriptionStarted = () => {
          if (disposed || !isJoined || isTranscribing) return;
          try {
            // Bootstrap transcription without showing the overlay; the
            // user can flip captions on from the transcript panel.
            api?.executeCommand("setSubtitles", true, false, "en-US");
          } catch (err) {
            console.warn("[Jitsi] auto transcription request failed:", err);
          }
        };

        const scheduleTranscriptionStart = () => {
          clearTranscriptionTimers();
          for (const delay of [1500, 5000, 10000]) {
            transcriptionTimers.push(setTimeout(ensureTranscriptionStarted, delay));
          }
        };

        api.addListener("videoConferenceJoined", (...a: unknown[]) => {
          isJoined = true;
          const ev = a[0] as { id?: string; displayName?: string } | undefined;
          localId = ev?.id ?? api?.myUserId?.() ?? null;
          if (ev?.displayName) localName = ev.displayName;
          args.onStateChange({ isJoined: true, networkQuality: "good" });
          if (args.displayName) {
            try {
              api?.executeCommand("displayName", args.displayName);
            } catch {
              /* not fatal */
            }
          }
          scheduleTranscriptionStart();
          void refreshDevices();
        });
        api.addListener("videoConferenceLeft", () => {
          isJoined = false;
          isTranscribing = false;
          areCaptionsVisible = false;
          clearTranscriptionTimers();
          transcriptChunks.clear();
          args.onStateChange({
            isJoined: false,
            isTranscribing: false,
            areCaptionsVisible: false,
            networkQuality: "unknown",
            transcripts: [],
          });
        });

        api.addListener("transcriptionChunkReceived", (...a: unknown[]) => {
          const ev = a[0] as
            | {
                data?: {
                  messageID?: string;
                  participant?: { id?: string; name?: string };
                  final?: string;
                  stable?: string;
                  unstable?: string;
                };
              }
            | undefined;
          const data = ev?.data;
          if (!data?.messageID) return;
          const text = (
            data.final ??
            `${data.stable ?? ""}${data.unstable ?? ""}`
          ).trim();
          if (!text) return;
          transcriptChunks.set(data.messageID, {
            id: data.messageID,
            participantId: data.participant?.id ?? "",
            participantName: (data.participant?.name || "Guest").trim(),
            text,
            isFinal: typeof data.final === "string",
            timestamp: Date.now(),
          });
          while (transcriptChunks.size > TRANSCRIPT_MAX_CHUNKS) {
            const oldest = transcriptChunks.keys().next().value;
            if (oldest === undefined) break;
            transcriptChunks.delete(oldest);
          }
          emitTranscripts();
        });
        api.addListener("transcribingStatusChanged", (...a: unknown[]) => {
          const ev = a[0] as { on?: boolean } | undefined;
          isTranscribing = !!ev?.on;
          args.onStateChange({ isTranscribing });
          if (isTranscribing) clearTranscriptionTimers();
          else if (isJoined) scheduleTranscriptionStart();
        });
        api.addListener("audioMuteStatusChanged", (...a: unknown[]) => {
          const ev = a[0] as { muted?: boolean } | undefined;
          args.onStateChange({ isAudioMuted: !!ev?.muted });
        });
        api.addListener("videoMuteStatusChanged", (...a: unknown[]) => {
          const ev = a[0] as { muted?: boolean } | undefined;
          args.onStateChange({ isVideoMuted: !!ev?.muted });
        });
        api.addListener("screenSharingStatusChanged", (...a: unknown[]) => {
          const ev = a[0] as { on?: boolean } | undefined;
          args.onStateChange({ isScreenSharing: !!ev?.on });
        });
        api.addListener("tileViewChanged", (...a: unknown[]) => {
          const ev = a[0] as { enabled?: boolean } | undefined;
          args.onStateChange({ isTileView: !!ev?.enabled });
        });
        // We intentionally do NOT subscribe to Jitsi's `chatUpdated`
        // event. Reason: when we call `sendChatMessage` via the
        // IFrame API, Jitsi internally emits chatUpdated with
        // `isOpen: false` (because its native chat panel is in fact
        // closed — we hide it with CSS and never toggle it). Echoing
        // that into our React state shut our own ChatPanel every
        // time the user pressed Enter to send. `state.isChatOpen` is
        // owned by useJitsi.toggleChat (purely local) and our own
        // unread counter is maintained by the incoming/outgoing
        // listeners below.

        // Remote message → push into the shared chatLog. `from` is the
        // participant JID-derived id, `nick` is their display name.
        // Some Jitsi builds echo our own chat messages back to us
        // through incomingMessage; outgoingMessage already covered
        // those, so ignore any incomingMessage where `from` matches
        // the local participant.
        api.addListener("incomingMessage", (...a: unknown[]) => {
          const ev = a[0] as
            | {
                from?: string;
                message?: string;
                nick?: string;
                privateMessage?: boolean;
              }
            | undefined;
          if (!ev?.message) return;
          const myId = localId ?? api?.myUserId?.() ?? null;
          if (myId && ev.from && ev.from === myId) return;
          pushChatMessage(
            ev.from ?? "",
            (ev.nick || "Guest").trim(),
            ev.message,
            false,
            !!ev.privateMessage,
          );
        });

        // Our own outgoing chat message — Jitsi echoes it back via
        // this event, so we don't need a parallel "I just sent it"
        // optimistic insert.
        api.addListener("outgoingMessage", (...a: unknown[]) => {
          const ev = a[0] as
            | { message?: string; privateMessage?: boolean }
            | undefined;
          if (!ev?.message) return;
          pushChatMessage(
            localId ?? "self",
            localName,
            ev.message,
            true,
            !!ev.privateMessage,
          );
        });

        // Cross-client reaction broadcast: we send our own reactions
        // via `sendEndpointTextMessage` so every participant gets the
        // reactor's display name (Jitsi's built-in `sendReaction`
        // doesn't surface it through the IFrame API).
        api.addListener("endpointTextMessageReceived", (...a: unknown[]) => {
          const ev = a[0] as
            | {
                data?: {
                  senderInfo?: { id?: string; jid?: string };
                  eventData?: { text?: string; name?: string };
                };
              }
            | undefined;
          const raw = ev?.data?.eventData?.text;
          if (!raw) return;
          let parsed: AiqlickReactionPayload | null = null;
          try {
            const obj = JSON.parse(raw);
            if (obj?.type === "aiqlick-reaction") {
              parsed = obj as AiqlickReactionPayload;
            }
          } catch {
            return;
          }
          if (!parsed) return;
          // Ignore our own broadcast — the local sender already
          // pushed the reaction via pushReaction in the command path.
          const senderId = ev?.data?.senderInfo?.id ?? "";
          if (senderId && localId && senderId === localId) return;
          pushReaction(
            senderId,
            (parsed.senderName || "Someone").trim(),
            parsed.kind,
          );
        });
        api.addListener("raiseHandUpdated", (...a: unknown[]) => {
          const ev = a[0] as { id?: string; handRaised?: number } | undefined;
          if (!ev) return;
          const myId = localId ?? api?.myUserId?.() ?? null;
          if (myId && ev.id && ev.id !== myId) return;
          args.onStateChange({ isHandRaised: (ev.handRaised ?? 0) > 0 });
        });
        api.addListener("recordingStatusChanged", (...a: unknown[]) => {
          const ev = a[0] as { on?: boolean } | undefined;
          args.onStateChange({ isRecording: !!ev?.on });
        });
        // Best-effort connection-quality signal. Jitsi's iframe API
        // exposes peerConnectionFailure for ICE failures and
        // dataChannelOpened/Closed for transport health; we map them to
        // a coarse three-step indicator. When neither fires the
        // indicator stays "good" while joined.
        api.addListener("peerConnectionFailure", () => {
          args.onStateChange({ networkQuality: "poor" });
        });
        api.addListener("dataChannelOpened", () => {
          if (isJoined) args.onStateChange({ networkQuality: "good" });
        });
        api.addListener("deviceListChanged", () => {
          void refreshDevices();
        });

        const refreshParticipants = () => {
          try {
            const myId = localId ?? api?.myUserId?.() ?? null;
            if (myId && !localId) localId = myId;
            const list = api?.getParticipantsInfo?.() ?? [];
            const participants: ParticipantInfo[] = list.map((p) => ({
              id: p.participantId,
              displayName:
                (p.displayName || p.formattedDisplayName || "").trim() || "Guest",
              audioMuted: false,
              videoMuted: false,
              isLocal: !!myId && p.participantId === myId,
            }));
            // Keep localName in sync — the user can rename mid-call
            // and our reaction broadcasts need the current value.
            const me = participants.find((p) => p.isLocal);
            if (me?.displayName) localName = me.displayName;
            const count = api?.getNumberOfParticipants?.() ?? participants.length;
            args.onStateChange({ participants, participantCount: count });
          } catch {
            /* ignore */
          }
        };

        api.addListener("participantJoined", refreshParticipants);
        api.addListener("participantLeft", refreshParticipants);
        api.addListener("displayNameChange", refreshParticipants);
        api.addListener("videoConferenceJoined", refreshParticipants);
      })
      .catch((err: unknown) => {
        args.onStateChange({
          error: err instanceof Error ? err.message : String(err),
        });
      });
  };

  init();

  return {
    execute(command: JitsiCommandName, ...rest: unknown[]) {
      switch (command) {
        case "toggleAudio":
          api?.executeCommand("toggleAudio");
          return;
        case "toggleVideo":
          api?.executeCommand("toggleVideo");
          return;
        case "toggleScreenShare":
          api?.executeCommand("toggleShareScreen");
          return;
        case "toggleTileView":
          api?.executeCommand("toggleTileView");
          return;
        case "setLayoutTile":
          api?.executeCommand("setTileView", true);
          return;
        case "setLayoutSpeaker":
          api?.executeCommand("setTileView", false);
          return;
        case "toggleChat":
          api?.executeCommand("toggleChat");
          return;
        case "toggleRaiseHand":
          api?.executeCommand("toggleRaiseHand");
          return;
        case "toggleSubtitles":
          try {
            setCaptions(!areCaptionsVisible);
          } catch (err) {
            console.warn("[Jitsi] toggleSubtitles failed:", err);
          }
          return;
        case "setSubtitlesOn":
          try {
            setCaptions(true);
          } catch {
            /* ignore */
          }
          return;
        case "setSubtitlesOff":
          try {
            setCaptions(false);
          } catch {
            /* ignore */
          }
          return;
        case "sendReaction": {
          const kind = rest[0] as ReactionKind;
          if (!kind) return;
          // Native sendReaction drives Jitsi's own animation pipeline
          // (we hide its floating emoji via CSS, but the moderator
          // panel and analytics still consume it). Keep firing it.
          try {
            api?.executeCommand("sendReaction", kind);
          } catch (err) {
            console.warn("[Jitsi] sendReaction failed:", err);
          }
          // Sidecar broadcast so every participant's ReactionsOverlay
          // gets the reactor's display name. Empty `to` broadcasts to
          // the whole conference.
          const payload: AiqlickReactionPayload = {
            type: "aiqlick-reaction",
            kind,
            senderName: localName,
          };
          try {
            api?.executeCommand(
              "sendEndpointTextMessage",
              "",
              JSON.stringify(payload),
            );
          } catch (err) {
            console.warn("[Jitsi] reaction sidecar broadcast failed:", err);
          }
          // Optimistic local render — don't wait for our own broadcast
          // to bounce back.
          pushReaction(localId ?? "self", localName, kind);
          return;
        }
        case "sendChatMessage": {
          const text = (rest[0] as string | undefined)?.trim();
          if (!text) return;
          try {
            api?.executeCommand("sendChatMessage", text);
            // Jitsi will echo the message back via the outgoingMessage
            // listener — no optimistic insert needed.
          } catch (err) {
            console.warn("[Jitsi] sendChatMessage failed:", err);
          }
          return;
        }
        case "markChatRead":
          if (unreadChat !== 0) {
            unreadChat = 0;
            emitChat();
          }
          return;
        case "toggleBlur": {
          const next = !isBlurEnabled;
          // Jitsi's `setVideoBackgroundEffect` accepts `backgroundType`
          // values 'blur' / 'slight-blur' / 'image' / 'desktop-share'.
          // 'none' is NOT in the enum — when disabling we just pass
          // `backgroundEffectEnabled: false` with no type. The effect
          // also silently no-ops if the local camera is off, so the UI
          // should keep the toggle visually in sync regardless.
          try {
            api?.executeCommand(
              "setVideoBackgroundEffect",
              next
                ? {
                    backgroundEffectEnabled: true,
                    backgroundType: "blur",
                    blurValue: 25,
                  }
                : { backgroundEffectEnabled: false },
            );
            isBlurEnabled = next;
            args.onStateChange({ isBlurEnabled: next });
          } catch (err) {
            console.warn("[Jitsi] toggleBlur failed:", err);
          }
          return;
        }
        case "toggleNoiseSuppression":
          try {
            api?.executeCommand("toggleNoiseSuppression");
            isNoiseSuppressionOn = !isNoiseSuppressionOn;
            args.onStateChange({ isNoiseSuppressionOn });
          } catch (err) {
            console.warn("[Jitsi] toggleNoiseSuppression failed:", err);
          }
          return;
        case "setAudioInputDevice": {
          const d = rest[0] as MediaDevice | undefined;
          if (!d) return;
          api?.executeCommand("setAudioInputDevice", d.label, d.deviceId);
          void refreshDevices();
          return;
        }
        case "setVideoInputDevice": {
          const d = rest[0] as MediaDevice | undefined;
          if (!d) return;
          api?.executeCommand("setVideoInputDevice", d.label, d.deviceId);
          void refreshDevices();
          return;
        }
        case "setAudioOutputDevice": {
          const d = rest[0] as MediaDevice | undefined;
          if (!d) return;
          api?.executeCommand("setAudioOutputDevice", d.label, d.deviceId);
          void refreshDevices();
          return;
        }
        case "refreshDevices":
          void refreshDevices();
          return;
        case "hangup":
          api?.executeCommand("hangup");
          return;
        default:
          // Exhaustiveness guard — any new command added to the union
          // surfaces here at compile time.
          ((_: never) => _)(command as never);
      }
    },
    dispose() {
      disposed = true;
      clearTranscriptionTimers();
      try {
        api?.dispose();
      } catch {
        // Ignore double-dispose on fast refresh
      }
      api = null;
    },
  };
}

