import { useEffect, useRef, useState } from "react";

import {
  DEFAULT_JITSI_DOMAIN,
  JitsiMeetExternalAPIInstance,
  loadJitsiExternalApi,
} from "@/lib/jitsi-iframe";

interface UseJitsiApiArgs {
  /** Stable React ref pointing at the container that will host the iframe. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  roomName: string;
  jwt?: string | null;
  displayName?: string | null;
  domain?: string;
}

export interface JitsiApiState {
  api: JitsiMeetExternalAPIInstance | null;
  isJoined: boolean;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  isTileView: boolean;
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  participantCount: number;
  unreadChatCount: number;
  error: string | null;
}

const INITIAL: JitsiApiState = {
  api: null,
  isJoined: false,
  isAudioMuted: false,
  isVideoMuted: false,
  isScreenSharing: false,
  isTileView: true,
  isChatOpen: false,
  isParticipantsOpen: false,
  participantCount: 1,
  unreadChatCount: 0,
  error: null,
};

/**
 * Boots a Jitsi IFrame API session inside `containerRef`, returns a
 * state object reflecting the current conference, and a `commands`
 * object with bound action helpers.
 *
 * The iframe runs with EMPTY toolbar / disabled side panels so all
 * chrome comes from our React layer (MeetingHeader, MeetingToolbar,
 * side panels). The Jitsi backend (XMPP, JVB) is untouched — only
 * the visual shell is ours.
 */
export function useJitsiApi({
  containerRef,
  roomName,
  jwt,
  displayName,
  domain = DEFAULT_JITSI_DOMAIN,
}: UseJitsiApiArgs) {
  const [state, setState] = useState<JitsiApiState>(INITIAL);
  // Hold the live API so command callers don't have to wait for state.
  const apiRef = useRef<JitsiMeetExternalAPIInstance | null>(null);

  useEffect(() => {
    if (!containerRef.current || !roomName) return;

    let disposed = false;
    let instance: JitsiMeetExternalAPIInstance | null = null;

    loadJitsiExternalApi(domain)
      .then((Ctor) => {
        if (disposed || !containerRef.current) return;

        instance = new Ctor(domain, {
          roomName,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          jwt: jwt ?? undefined,
          userInfo: displayName ? { displayName } : undefined,
          configOverwrite: {
            // Hide the Jitsi-side chrome — our React layer renders
            // header, toolbar, and side panels.
            toolbarButtons: [],
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            hideConferenceSubject: true,
            hideConferenceTimer: true,
            hideParticipantsStats: true,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            startInTileView: true,
            notifications: [],
            disableThirdPartyRequests: true,
            enableClosePage: false,
            disableProfile: true,
            disableInviteFunctions: true,
            disableReactions: true,
            disablePolls: true,
            // Mute Jitsi-deployed custom side panels (the
            // Participants / Insights panes we used to mask with
            // opaque divs in the old fork).
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
            FILM_STRIP_MAX_HEIGHT: 120,
          },
        });

        apiRef.current = instance;
        setState((s) => ({ ...s, api: instance }));

        instance.addListener("videoConferenceJoined", () => {
          setState((s) => ({ ...s, isJoined: true }));
        });
        instance.addListener("videoConferenceLeft", () => {
          setState((s) => ({ ...s, isJoined: false }));
        });
        instance.addListener("audioMuteStatusChanged", (...args: unknown[]) => {
          const ev = args[0] as { muted: boolean } | undefined;
          setState((s) => ({ ...s, isAudioMuted: !!ev?.muted }));
        });
        instance.addListener("videoMuteStatusChanged", (...args: unknown[]) => {
          const ev = args[0] as { muted: boolean } | undefined;
          setState((s) => ({ ...s, isVideoMuted: !!ev?.muted }));
        });
        instance.addListener("screenSharingStatusChanged", (...args: unknown[]) => {
          const ev = args[0] as { on: boolean } | undefined;
          setState((s) => ({ ...s, isScreenSharing: !!ev?.on }));
        });
        instance.addListener("tileViewChanged", (...args: unknown[]) => {
          const ev = args[0] as { enabled: boolean } | undefined;
          setState((s) => ({ ...s, isTileView: !!ev?.enabled }));
        });
        instance.addListener("chatUpdated", (...args: unknown[]) => {
          const ev = args[0] as { isOpen: boolean; unreadCount: number } | undefined;
          setState((s) => ({
            ...s,
            isChatOpen: !!ev?.isOpen,
            unreadChatCount: ev?.unreadCount ?? 0,
          }));
        });
        instance.addListener("participantJoined", () => {
          setState((s) => ({ ...s, participantCount: s.participantCount + 1 }));
        });
        instance.addListener("participantLeft", () => {
          setState((s) => ({
            ...s,
            participantCount: Math.max(1, s.participantCount - 1),
          }));
        });
      })
      .catch((err: unknown) => {
        if (disposed) return;
        const message = err instanceof Error ? err.message : String(err);
        setState((s) => ({ ...s, error: message }));
      });

    return () => {
      disposed = true;
      try {
        instance?.dispose();
      } catch {
        // Ignore double-dispose during fast refresh in dev
      }
      apiRef.current = null;
    };
    // Re-running this hook would re-create the iframe. We intentionally
    // bind to roomName/jwt — if those change, that's a different meeting.
  }, [containerRef, roomName, jwt, displayName, domain]);

  // Bound action helpers. Safe to call before the API is ready; they
  // simply no-op until `apiRef.current` is set.
  const commands = {
    toggleAudio: () => apiRef.current?.executeCommand("toggleAudio"),
    toggleVideo: () => apiRef.current?.executeCommand("toggleVideo"),
    toggleScreenShare: () => apiRef.current?.executeCommand("toggleShareScreen"),
    toggleTileView: () => apiRef.current?.executeCommand("toggleTileView"),
    toggleChat: () => apiRef.current?.executeCommand("toggleChat"),
    hangup: () => apiRef.current?.executeCommand("hangup"),
  };

  return { state, commands };
}
