import type {
  CreateJitsiEmbedArgs,
  JitsiCommandName,
  JitsiEmbedHandle,
  ParticipantInfo,
} from "./jitsi-types";

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

export function createJitsiEmbed(args: CreateJitsiEmbedWebArgs): JitsiEmbedHandle {
  let api: JitsiMeetExternalAPI | null = null;
  let disposed = false;
  let isJoined = false;
  let isTranscribing = false;
  const transcriptionTimers: Array<ReturnType<typeof setTimeout>> = [];
  const parent = args.container;
  const clearTranscriptionTimers = () => {
    transcriptionTimers.splice(0).forEach(clearTimeout);
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
            disableReactions: true,
            disablePolls: true,
            // Jitsi's own participants pane is disabled — the wrapper
            // renders its own ParticipantsPanel matching our chrome.
            participantsPane: { enabled: false },
            breakoutRooms: {
              hideAddRoomButton: true,
              hideAutoAssignButton: true,
              hideJoinRoomButton: true,
            },
          },
          interfaceConfigOverwrite: {
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
            api?.executeCommand("setSubtitles", true);
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
          args.onStateChange({ isJoined: true });
          // Force the display name even after join — Jitsi sometimes
          // shows "Fellow Jitster" in chat when joining as a guest
          // even though the JWT carries a name.
          if (args.displayName) {
            try {
              api?.executeCommand("displayName", args.displayName);
            } catch {
              /* not fatal */
            }
          }
          scheduleTranscriptionStart();
        });
        api.addListener("videoConferenceLeft", () => {
          isJoined = false;
          isTranscribing = false;
          clearTranscriptionTimers();
          args.onStateChange({ isJoined: false, isTranscribing: false });
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
          // handRaised > 0 means raised (it's a timestamp), 0 means lowered.
          // Only update *our* state when the event is for the local user.
          const localId = api?.myUserId?.();
          if (localId && ev.id && ev.id !== localId) return;
          args.onStateChange({ isHandRaised: (ev.handRaised ?? 0) > 0 });
        });

        const refreshParticipants = () => {
          try {
            const localId = api?.myUserId?.();
            const list = api?.getParticipantsInfo?.() ?? [];
            const participants: ParticipantInfo[] = list.map((p) => ({
              id: p.participantId,
              displayName:
                (p.displayName || p.formattedDisplayName || "").trim() || "Guest",
              // Remote mute state isn't exposed by the iframe API; the
              // panel relies on the local-only `isAudioMuted` / `isVideoMuted`
              // for the local row, and shows a neutral icon for remotes.
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
        // Initial snapshot once we've actually joined.
        api.addListener("videoConferenceJoined", refreshParticipants);
      })
      .catch((err: unknown) => {
        args.onStateChange({
          error: err instanceof Error ? err.message : String(err),
        });
      });
  };

  init();

  const commandMap: Partial<Record<JitsiCommandName, string>> = {
    toggleAudio: "toggleAudio",
    toggleVideo: "toggleVideo",
    toggleScreenShare: "toggleShareScreen",
    toggleTileView: "toggleTileView",
    toggleChat: "toggleChat",
    toggleRaiseHand: "toggleRaiseHand",
    hangup: "hangup",
    // toggleParticipants is handled locally — we render our own panel.
  };

  return {
    execute(command: JitsiCommandName) {
      const mapped = commandMap[command];
      if (mapped) api?.executeCommand(mapped);
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
