import { useEffect, useState } from "react";
import { Users, Video } from "lucide-react";

interface Props {
  title: string;
  participantCount: number;
  isJoined: boolean;
}

/**
 * Top header bar — primary-tinted icon, meeting title, live timer,
 * participant count. Mirrors the aiqlick-frontend MeetingHeader
 * design so the meeting chrome feels continuous with the rest of
 * the product.
 */
export default function MeetingHeader({ title, participantCount, isJoined }: Props) {
  const elapsed = useElapsedSeconds(isJoined);

  return (
    <div className="flex items-center justify-between px-5 h-14 bg-gray-950 border-b border-gray-800 shrink-0">
      {/* Left: icon + title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20">
          <Video className="w-4 h-4 text-primary-light" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-white truncate max-w-[420px]">
            {title}
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] text-gray-400">
              {isJoined ? "Connected" : "Connecting…"}
            </span>
          </div>
        </div>
      </div>

      {/* Center: timer */}
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-800/60 border border-gray-700/50">
        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-sm text-white font-mono tabular-nums tracking-wider">
          {isJoined ? formatTime(elapsed) : "--:--"}
        </span>
      </div>

      {/* Right: participant count */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800/60 border border-gray-700/50">
        <Users className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-white">{participantCount}</span>
      </div>
    </div>
  );
}

function useElapsedSeconds(isRunning: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!isRunning) {
      setSeconds(0);
      return;
    }
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);
  return seconds;
}

function formatTime(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
