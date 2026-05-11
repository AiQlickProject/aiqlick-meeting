import {
  Mic,
  MicOff,
  Video as VideoOn,
  VideoOff,
  ScreenShare,
  MessageSquare,
  Grid2X2,
  PhoneOff,
} from "lucide-react";

import ToolbarButton from "./ToolbarButton";
import type { JitsiApiState } from "@/hooks/useJitsiApi";

interface Props {
  state: JitsiApiState;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleTileView: () => void;
  onToggleChat: () => void;
  onHangup: () => void;
}

/**
 * Bottom toolbar — a single pill that holds every action. Mirrors
 * MeetingToolbar from aiqlick-frontend: rounded buttons, primary
 * highlight on toggle, scale-on-press, red danger for hangup.
 */
export default function MeetingToolbar({
  state,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleTileView,
  onToggleChat,
  onHangup,
}: Props) {
  return (
    <div className="flex justify-center pb-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-1 px-2 py-2 rounded-2xl bg-gray-900/95 backdrop-blur-md border border-white/5 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)]">
        <ToolbarButton
          tooltip={state.isAudioMuted ? "Unmute" : "Mute"}
          active={state.isAudioMuted}
          onClick={onToggleAudio}
        >
          {state.isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </ToolbarButton>

        <ToolbarButton
          tooltip={state.isVideoMuted ? "Start video" : "Stop video"}
          active={state.isVideoMuted}
          onClick={onToggleVideo}
        >
          {state.isVideoMuted ? <VideoOff className="w-5 h-5" /> : <VideoOn className="w-5 h-5" />}
        </ToolbarButton>

        <ToolbarButton
          tooltip="Share screen"
          highlighted={state.isScreenSharing}
          onClick={onToggleScreenShare}
        >
          <ScreenShare className="w-5 h-5" />
        </ToolbarButton>

        <ToolbarButton
          tooltip="Chat"
          highlighted={state.isChatOpen}
          badge={state.unreadChatCount}
          onClick={onToggleChat}
        >
          <MessageSquare className="w-5 h-5" />
        </ToolbarButton>

        <ToolbarButton
          tooltip={state.isTileView ? "Speaker view" : "Tile view"}
          highlighted={state.isTileView}
          onClick={onToggleTileView}
        >
          <Grid2X2 className="w-5 h-5" />
        </ToolbarButton>

        {/* Separator before the destructive action */}
        <div className="w-px h-6 bg-white/10 mx-1" />

        <button
          type="button"
          title="Leave meeting"
          aria-label="Leave meeting"
          onClick={onHangup}
          className="flex items-center justify-center w-14 h-10 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all duration-150 active:scale-95"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
