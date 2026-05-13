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
