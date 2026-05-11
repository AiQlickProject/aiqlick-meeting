import { useMemo, useRef } from "react";

import JitsiEmbed from "@/components/JitsiEmbed";
import MeetingHeader from "@/components/MeetingHeader";
import MeetingToolbar from "@/components/MeetingToolbar";
import { useJitsiApi } from "@/hooks/useJitsiApi";
import { parseMeetingUrl } from "@/lib/parse-url";

/**
 * The whole meeting view. Renders our React chrome (header at top,
 * toolbar at bottom) around a Jitsi IFrame API session in the
 * middle. The Jitsi iframe is configured with empty toolbars/disabled
 * panels so every visible control comes from React.
 */
export default function MeetingPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { roomName, jwt, displayName, subject } = useMemo(
    () => parseMeetingUrl(),
    [],
  );

  const { state, commands } = useJitsiApi({
    containerRef,
    roomName,
    jwt,
    displayName,
  });

  const title = subject?.trim() || humanizeRoomName(roomName) || "Aiqlick Meeting";

  if (!roomName) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-gray-950 text-white gap-3 p-6 text-center">
        <h1 className="text-lg font-semibold">No room specified</h1>
        <p className="text-sm text-gray-400 max-w-md">
          Open this page with a room slug in the URL, e.g.{" "}
          <code className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-200">
            /my-room-name
          </code>
          .
        </p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-gray-950 text-white gap-3 p-6 text-center">
        <h1 className="text-lg font-semibold">Unable to join meeting</h1>
        <p className="text-sm text-gray-400">{state.error}</p>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-gray-950 select-none">
      <MeetingHeader
        title={title}
        participantCount={state.participantCount}
        isJoined={state.isJoined}
      />

      {/* Stage: Jitsi iframe (video) + floating toolbar overlay */}
      <div className="flex-1 min-h-0 relative">
        <JitsiEmbed ref={containerRef} />

        <div className="absolute inset-x-0 bottom-0 z-10">
          <MeetingToolbar
            state={state}
            onToggleAudio={commands.toggleAudio}
            onToggleVideo={commands.toggleVideo}
            onToggleScreenShare={commands.toggleScreenShare}
            onToggleTileView={commands.toggleTileView}
            onToggleChat={commands.toggleChat}
            onHangup={commands.hangup}
          />
        </div>
      </div>
    </div>
  );
}

function humanizeRoomName(slug: string): string {
  if (!slug) return "";
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
