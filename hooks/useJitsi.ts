import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";

import type {
  AttachContainer,
  JitsiCommands,
  JitsiEmbedHandle,
  JitsiState,
  LayoutMode,
  MediaDevice,
  NativeJitsiRef,
  ReactionKind,
} from "./jitsi-types";
import { EMPTY_DEVICES, EMPTY_SELECTED_DEVICES } from "./jitsi-types";
import { createJitsiEmbed } from "./jitsi-embed";

const INITIAL: JitsiState = {
  isJoined: false,
  isAudioMuted: false,
  isVideoMuted: false,
  isScreenSharing: false,
  isTileView: true,
  isTranscribing: false,
  areCaptionsVisible: false,
  isChatOpen: false,
  isParticipantsOpen: false,
  isHandRaised: false,
  isBlurEnabled: false,
  isNoiseSuppressionOn: false,
  isRecording: false,
  networkQuality: "unknown",
  participantCount: 1,
  participants: [],
  transcripts: [],
  chatMessages: [],
  recentReactions: [],
  unreadChatCount: 0,
  availableDevices: EMPTY_DEVICES,
  selectedDevices: EMPTY_SELECTED_DEVICES,
  error: null,
};

interface UseJitsiArgs {
  roomName: string;
  jwt?: string | null;
  displayName?: string | null;
}

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
        ?.jitsiDomain ?? "meet.aiqlick.com"
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

  useEffect(() => {
    if (Platform.OS === "web") return;
    createHandle(null);
    return () => {
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, [createHandle]);

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
    setLayout: (mode: LayoutMode) =>
      handleRef.current?.execute(mode === "tile" ? "setLayoutTile" : "setLayoutSpeaker"),
    // toggleChat is now PURELY local — we render our own ChatPanel and
    // never open Jitsi's native chat. The opening side-effect also
    // clears the unread counter via markChatRead, mirroring how
    // Teams / Meet behave when you open the chat pane.
    toggleChat: () =>
      setState((s) => {
        const next = !s.isChatOpen;
        if (next) handleRef.current?.execute("markChatRead");
        return {
          ...s,
          isChatOpen: next,
          unreadChatCount: next ? 0 : s.unreadChatCount,
        };
      }),
    toggleParticipants: () =>
      setState((s) => ({ ...s, isParticipantsOpen: !s.isParticipantsOpen })),
    toggleRaiseHand: () => handleRef.current?.execute("toggleRaiseHand"),
    toggleSubtitles: () => handleRef.current?.execute("toggleSubtitles"),
    setSubtitles: (visible: boolean) =>
      handleRef.current?.execute(visible ? "setSubtitlesOn" : "setSubtitlesOff"),
    sendReaction: (kind: ReactionKind) =>
      handleRef.current?.execute("sendReaction", kind),
    sendChatMessage: (text: string) =>
      handleRef.current?.execute("sendChatMessage", text),
    markChatRead: () => handleRef.current?.execute("markChatRead"),
    toggleBlur: () => handleRef.current?.execute("toggleBlur"),
    toggleNoiseSuppression: () => handleRef.current?.execute("toggleNoiseSuppression"),
    setAudioInputDevice: (d: MediaDevice) =>
      handleRef.current?.execute("setAudioInputDevice", d),
    setVideoInputDevice: (d: MediaDevice) =>
      handleRef.current?.execute("setVideoInputDevice", d),
    setAudioOutputDevice: (d: MediaDevice) =>
      handleRef.current?.execute("setAudioOutputDevice", d),
    refreshDevices: () => handleRef.current?.execute("refreshDevices"),
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
