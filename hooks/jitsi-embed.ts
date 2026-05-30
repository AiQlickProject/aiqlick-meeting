import type {
  CreateJitsiEmbedArgs,
  JitsiCommandName,
  JitsiEmbedHandle,
  JitsiState,
  NativeJitsiRef,
} from "./jitsi-types";

interface CreateNativeJitsiEmbedArgs extends CreateJitsiEmbedArgs {
  meetingRef: React.RefObject<NativeJitsiRef | null>;
  getState: () => JitsiState;
}

/**
 * Native (iOS / Android) embed. The @jitsi/react-native-sdk component
 * owns most of the in-meeting UI on mobile, so we only forward the
 * commands we can — mute/unmute audio + video and hang up. Everything
 * else no-ops cleanly; the toolbar still renders, the buttons just
 * don't drive Jitsi until we wire the native bridge.
 */
export function createJitsiEmbed(args: CreateNativeJitsiEmbedArgs): JitsiEmbedHandle {
  return {
    execute(command: JitsiCommandName) {
      const meeting = args.meetingRef.current;
      const current = args.getState();

      if (command === "toggleAudio") {
        const muted = !current.isAudioMuted;
        meeting?.setAudioMuted?.(muted);
        args.onStateChange({ isAudioMuted: muted });
        return;
      }

      if (command === "toggleVideo") {
        const muted = !current.isVideoMuted;
        meeting?.setVideoMuted?.(muted);
        args.onStateChange({ isVideoMuted: muted });
        return;
      }

      if (command === "hangup") {
        meeting?.close?.();
        args.onStateChange({ isJoined: false });
      }
    },
    dispose() {
      args.meetingRef.current?.close?.();
    },
  };
}
