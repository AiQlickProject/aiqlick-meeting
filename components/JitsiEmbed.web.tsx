import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import type { JitsiEmbedRef } from "@/hooks/jitsi-types";

interface Props {
  embed: JitsiEmbedRef;
}

/**
 * Web embed container. The Jitsi IFrame API creates an `<iframe>`
 * inside the DOM node we hand it via `embed.current?.attach()`.
 *
 * On web we render a plain `<div>` here — react-native-web allows
 * raw HTML elements when needed. The native build (`.tsx` sibling)
 * renders `JitsiMeeting` from the React Native SDK instead.
 */
export default function JitsiEmbed({ embed }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const el = containerRef.current;
    embed.current?.attach(el ?? null);
    return () => {
      embed.current?.attach(null);
    };
  }, [embed]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "#111827",
        overflow: "hidden",
      }}
    />
  );
}
