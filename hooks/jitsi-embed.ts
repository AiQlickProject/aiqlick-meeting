import type {
  CreateJitsiEmbedArgs,
  JitsiCommandName,
  JitsiEmbedHandle,
} from "./jitsi-types";

/**
 * Native implementation — placeholder. The mobile build hasn't been
 * wired into `@jitsi/react-native-sdk` yet; we ship the web target
 * first. When this lands, replace the stub with `JitsiMeeting`-based
 * setup that maps commands to `JitsiRefProps.dispatchCommand()` and
 * events back to `onStateChange`.
 *
 * Keeping the function signature identical to the web build means
 * the outer React tree (useJitsi, MeetingRoute, etc.) is platform-
 * agnostic — only this file changes when mobile lands.
 */
export function createJitsiEmbed(args: CreateJitsiEmbedArgs): JitsiEmbedHandle {
  args.onStateChange({
    error:
      "Mobile meeting client coming soon. Open this room from a browser to join now.",
  });
  return {
    attach() {
      /* native renderer attaches a native view via JitsiMeeting component */
    },
    execute(_command: JitsiCommandName) {
      /* dispatchCommand on the native SDK */
    },
    dispose() {
      /* sdk teardown */
    },
  };
}
