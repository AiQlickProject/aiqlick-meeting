import { useEffect, useRef, useState } from "react";
import Constants from "expo-constants";

import type { JitsiCommands, JitsiEmbedHandle, JitsiState } from "./jitsi-types";
import { createJitsiEmbed } from "./jitsi-embed";

const INITIAL: JitsiState = {
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
 */
export function useJitsi({ roomName, jwt, displayName }: UseJitsiArgs) {
  const [state, setState] = useState<JitsiState>(INITIAL);
  const handleRef = useRef<JitsiEmbedHandle | null>(null);
  const domain =
    (Constants.expoConfig?.extra as { jitsiDomain?: string } | undefined)
      ?.jitsiDomain ?? "book.aiqlick.com";

  useEffect(() => {
    if (!roomName) return;

    let disposed = false;
    const handle = createJitsiEmbed({
      domain,
      roomName,
      jwt,
      displayName,
      onStateChange: (patch) => {
        if (disposed) return;
        setState((s) => ({ ...s, ...patch }));
      },
    });
    handleRef.current = handle;

    return () => {
      disposed = true;
      handle.dispose();
      handleRef.current = null;
    };
  }, [roomName, jwt, displayName, domain]);

  const commands: JitsiCommands = {
    toggleAudio: () => handleRef.current?.execute("toggleAudio"),
    toggleVideo: () => handleRef.current?.execute("toggleVideo"),
    toggleScreenShare: () => handleRef.current?.execute("toggleScreenShare"),
    toggleTileView: () => handleRef.current?.execute("toggleTileView"),
    toggleChat: () => handleRef.current?.execute("toggleChat"),
    hangup: () => handleRef.current?.execute("hangup"),
  };

  return { state, commands, embed: handleRef };
}
