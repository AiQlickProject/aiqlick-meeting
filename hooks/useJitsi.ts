import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";

import type {
  AttachContainer,
  JitsiCommands,
  JitsiEmbedHandle,
  JitsiState,
  NativeJitsiRef,
} from "./jitsi-types";
import { createJitsiEmbed } from "./jitsi-embed";

const INITIAL: JitsiState = {
  isJoined: false,
  isAudioMuted: false,
  isVideoMuted: false,
  isScreenSharing: false,
  isTileView: true,
  isChatOpen: false,
  isParticipantsOpen: false,
  isHandRaised: false,
  participantCount: 1,
  participants: [],
  unreadChatCount: 0,
  error: null,
};

interface UseJitsiArgs {
  roomName: string;
  jwt?: string | null;
  displayName?: string | null;
}

/**
 * Public entry point — same shape on every platform. Internally
 * delegates to the platform-specific embed (`jitsi-embed.web.ts` for
 * browser, `jitsi-embed.ts` for native). Both report state via the
 * same `JitsiState` interface so the surrounding UI is written once.
 *
 * Web flow: parent renders <JitsiEmbed attachContainer={...} />.
 * That component assigns its `<div>` via callback ref, which calls
 * `attachContainer(el)` here. We then create the Jitsi handle with
 * the element already in hand — no useEffect ordering race.
 */
export function useJitsi({ roomName, jwt, displayName }: UseJitsiArgs) {
  const [state, setState] = useState<JitsiState>(INITIAL);
  const stateRef = useRef<JitsiState>(INITIAL);
  const handleRef = useRef<JitsiEmbedHandle | null>(null);
  const nativeMeetingRef = useRef<NativeJitsiRef | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const domain = (() => {
    if (typeof window !== "undefined") {
      const override = new URLSearchParams(window.location.search).get("domain");
      if (override) return override;
    }
    return (
      (Constants.expoConfig?.extra as { jitsiDomain?: string } | undefined)
        ?.jitsiDomain ?? "book.aiqlick.com"
    );
  })();

  const onStateChange = useCallback((patch: Partial<JitsiState>) => {
    setState((s) => {
      const next = { ...s, ...patch };
      stateRef.current = next;
      return next;
    });
  }, []);

  const createHandle = useCallback(
    (container: HTMLElement | null) => {
      if (handleRef.current) {
        handleRef.current.dispose();
        handleRef.current = null;
      }
      if (!roomName) return;
      // On native, container is not used.
      if (Platform.OS === "web" && !container) return;
      handleRef.current = createJitsiEmbed({
        domain,
        roomName,
        jwt,
        displayName,
        onStateChange,
        ...(Platform.OS !== "web"
          ? {
              meetingRef: nativeMeetingRef,
              getState: () => stateRef.current,
            }
          : {}),
        ...(container ? { container } : {}),
      } as Parameters<typeof createJitsiEmbed>[0]);
    },
    [roomName, jwt, displayName, domain, onStateChange],
  );

  const attachContainer: AttachContainer = useCallback(
    (el) => {
      if (containerRef.current === el) return;
      containerRef.current = el;
      createHandle(el);
    },
    [createHandle],
  );

  // Native path: there's no DOM container, so create the handle as
  // soon as we have a roomName.
  useEffect(() => {
    if (Platform.OS === "web") return;
    createHandle(null);
    return () => {
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, [createHandle]);

  // Web path: clean up on unmount.
  useEffect(() => {
    return () => {
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, []);

  const commands: JitsiCommands = {
    toggleAudio: () => handleRef.current?.execute("toggleAudio"),
    toggleVideo: () => handleRef.current?.execute("toggleVideo"),
    toggleScreenShare: () => handleRef.current?.execute("toggleScreenShare"),
    toggleTileView: () => handleRef.current?.execute("toggleTileView"),
    toggleChat: () => handleRef.current?.execute("toggleChat"),
    toggleParticipants: () =>
      setState((s) => ({ ...s, isParticipantsOpen: !s.isParticipantsOpen })),
    toggleRaiseHand: () => handleRef.current?.execute("toggleRaiseHand"),
    hangup: () => handleRef.current?.execute("hangup"),
  };

  return {
    state,
    commands,
    attachContainer,
    nativeMeetingProps:
      Platform.OS === "web"
        ? undefined
        : {
            domain,
            roomName,
            jwt,
            displayName,
            onStateChange,
            meetingRef: nativeMeetingRef,
          },
  };
}
