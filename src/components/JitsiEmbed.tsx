import { forwardRef } from "react";

/**
 * Container that the Jitsi IFrame API populates with the meeting
 * iframe. Sized to fill the available space. The `useJitsiApi` hook
 * mounts the iframe inside `ref.current`.
 */
const JitsiEmbed = forwardRef<HTMLDivElement>(function JitsiEmbed(_, ref) {
  return (
    <div className="flex-1 min-h-0 relative overflow-hidden bg-gray-900">
      <div
        ref={ref}
        className="absolute inset-0 [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
      />
    </div>
  );
});

export default JitsiEmbed;
