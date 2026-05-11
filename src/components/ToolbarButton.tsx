import { clsx } from "clsx";
import type { ReactNode } from "react";

interface Props {
  tooltip: string;
  active?: boolean;
  danger?: boolean;
  highlighted?: boolean;
  badge?: number;
  onClick: () => void;
  children: ReactNode;
}

/**
 * Single toolbar affordance. Variants mirror MeetingToolbar in
 * aiqlick-frontend:
 *
 *   default     bg-gray-700/70   text-gray-200
 *   highlighted bg-primary/20    text-primary-light + ring
 *   active      bg-red-500/90    text-white
 *   danger      bg-red-600       text-white
 */
export default function ToolbarButton({
  tooltip,
  active,
  danger,
  highlighted,
  badge,
  onClick,
  children,
}: Props) {
  return (
    <button
      type="button"
      title={tooltip}
      aria-label={tooltip}
      onClick={onClick}
      className={clsx(
        "relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-150",
        "active:scale-95",
        danger
          ? "bg-red-600 hover:bg-red-500 text-white"
          : active
            ? "bg-red-500/90 hover:bg-red-400/90 text-white"
            : highlighted
              ? "bg-primary/20 hover:bg-primary/30 text-primary-light ring-1 ring-primary/30"
              : "bg-transparent hover:bg-white/10 text-gray-200 hover:text-white",
      )}
    >
      {children}
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 rounded-full bg-primary text-[10px] font-bold text-white px-1">
          {badge}
        </span>
      )}
    </button>
  );
}
