import type {
  CreateJitsiEmbedArgs,
  JitsiCommandName,
  JitsiEmbedHandle,
} from "./jitsi-types";

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
    s.src = `https://${domain}/external_api.js`;
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

export function createJitsiEmbed(args: CreateJitsiEmbedArgs): JitsiEmbedHandle {
  let api: JitsiMeetExternalAPI | null = null;
  let attached: HTMLElement | null = null;
  let disposed = false;

  const init = () => {
    if (disposed || api || !attached) return;
    loadExternalApi(args.domain)
      .then((Ctor) => {
        if (disposed || !attached) return;
        api = new Ctor(args.domain, {
          roomName: args.roomName,
          parentNode: attached,
          width: "100%",
          height: "100%",
          jwt: args.jwt ?? undefined,
          userInfo: args.displayName ? { displayName: args.displayName } : undefined,
          configOverwrite: {
            toolbarButtons: [],
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            hideConferenceSubject: true,
            hideConferenceTimer: true,
            hideParticipantsStats: true,
            startInTileView: true,
            notifications: [],
            disableThirdPartyRequests: true,
            enableClosePage: false,
            disableProfile: true,
            disableInviteFunctions: true,
            disableReactions: true,
            disablePolls: true,
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

        api.addListener("videoConferenceJoined", () =>
          args.onStateChange({ isJoined: true }),
        );
        api.addListener("videoConferenceLeft", () =>
          args.onStateChange({ isJoined: false }),
        );
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
      })
      .catch((err: unknown) => {
        args.onStateChange({
          error: err instanceof Error ? err.message : String(err),
        });
      });
  };

  return {
    attach(el) {
      if (attached === el) return;
      attached = el;
      init();
    },
    execute(command: JitsiCommandName) {
      api?.executeCommand(command === "toggleScreenShare" ? "toggleShareScreen" : command);
    },
    dispose() {
      disposed = true;
      try {
        api?.dispose();
      } catch {
        // Ignore double-dispose on fast refresh
      }
      api = null;
      attached = null;
    },
  };
}
