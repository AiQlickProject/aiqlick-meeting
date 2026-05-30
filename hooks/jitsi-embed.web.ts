import { JITSI_BRANDING } from "@/lib/branding";

import type {
  AvailableDevices,
  CreateJitsiEmbedArgs,
  JitsiCommandName,
  JitsiEmbedHandle,
  MediaDevice,
  ParticipantInfo,
  ReactionKind,
  SelectedDevices,
  TranscriptChunk,
} from "./jitsi-types";
import { EMPTY_SELECTED_DEVICES } from "./jitsi-types";

const TRANSCRIPT_MAX_CHUNKS = 1000;

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

        api.addListener("videoConferenceJoined", () => {
          isJoined = true;
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
        api.addListener("chatUpdated", (...a: unknown[]) => {
          const ev = a[0] as { isOpen?: boolean; unreadCount?: number } | undefined;
          args.onStateChange({
            isChatOpen: !!ev?.isOpen,
            unreadChatCount: ev?.unreadCount ?? 0,
          });
        });
        api.addListener("raiseHandUpdated", (...a: unknown[]) => {
          const ev = a[0] as { id?: string; handRaised?: number } | undefined;
          if (!ev) return;
          const localId = api?.myUserId?.();
          if (localId && ev.id && ev.id !== localId) return;
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
            const localId = api?.myUserId?.();
            const list = api?.getParticipantsInfo?.() ?? [];
            const participants: ParticipantInfo[] = list.map((p) => ({
              id: p.participantId,
              displayName:
                (p.displayName || p.formattedDisplayName || "").trim() || "Guest",
              audioMuted: false,
              videoMuted: false,
              isLocal: !!localId && p.participantId === localId,
            }));
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
          try {
            api?.executeCommand("sendReaction", kind);
          } catch (err) {
            console.warn("[Jitsi] sendReaction failed:", err);
          }
          return;
        }
        case "toggleBlur":
          try {
            const next = !isBlurEnabled;
            // setBackgroundEffect with `blurValue: 25` matches Jitsi's
            // built-in "blur my background" preset. Disabling passes
            // backgroundEffectEnabled=false to clear the effect.
            api?.executeCommand("setVideoBackgroundEffect", {
              backgroundEffectEnabled: next,
              backgroundType: next ? "blur" : "none",
              blurValue: next ? 25 : 0,
            });
            isBlurEnabled = next;
            args.onStateChange({ isBlurEnabled: next });
          } catch (err) {
            console.warn("[Jitsi] toggleBlur failed:", err);
          }
          return;
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

