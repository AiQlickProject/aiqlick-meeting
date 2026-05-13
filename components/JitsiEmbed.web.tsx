import type { JitsiEmbedProps } from "@/hooks/jitsi-types";

/**
 * Web embed container. The Jitsi IFrame API mounts its `<iframe>`
 * inside the DOM node we hand it via the callback ref — `useJitsi`
 * creates the handle the moment React attaches this element, which
 * avoids the parent-vs-child useEffect ordering race we had with a
 * ref-based handshake.
 */
export default function JitsiEmbed({ attachContainer }: JitsiEmbedProps) {
  return (
    <div
      ref={attachContainer}
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "#111827",
        overflow: "hidden",
      }}
    />
  );
}
