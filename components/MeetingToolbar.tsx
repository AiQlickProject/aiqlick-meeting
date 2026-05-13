import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  MessageSquare,
  Grid2X2,
  PhoneOff,
} from "@tamagui/lucide-icons";
import { Pressable } from "react-native";
import { View, XStack } from "tamagui";

import ToolbarButton from "./ToolbarButton";
import type { JitsiState } from "@/hooks/jitsi-types";

interface Props {
  state: JitsiState;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleTileView: () => void;
  onToggleChat: () => void;
  onHangup: () => void;
}

/**
 * Bottom toolbar — a single dark pill containing every action.
 * Mirrors aiqlick-frontend's `MeetingToolbar`: rounded buttons,
 * transparent default, primary tint when a panel is open, red
 * danger for hangup.
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
    <XStack justifyContent="center" pointerEvents="box-none">
      <XStack
        alignItems="center"
        gap={4}
        paddingHorizontal={8}
        paddingVertical={8}
        borderRadius={16}
        backgroundColor="rgba(17, 24, 39, 0.95)"
        borderWidth={1}
        borderColor="rgba(255, 255, 255, 0.05)"
        shadowColor="#000"
        shadowOpacity={0.55}
        shadowRadius={40}
        shadowOffset={{ width: 0, height: 12 }}
        pointerEvents="auto"
      >
        <ToolbarButton
          tooltip={state.isAudioMuted ? "Unmute" : "Mute"}
          active={state.isAudioMuted}
          onPress={onToggleAudio}
        >
          {state.isAudioMuted ? (
            <MicOff size={20} color="#fff" />
          ) : (
            <Mic size={20} color="#e5e7eb" />
          )}
        </ToolbarButton>

        <ToolbarButton
          tooltip={state.isVideoMuted ? "Start video" : "Stop video"}
          active={state.isVideoMuted}
          onPress={onToggleVideo}
        >
          {state.isVideoMuted ? (
            <VideoOff size={20} color="#fff" />
          ) : (
            <Video size={20} color="#e5e7eb" />
          )}
        </ToolbarButton>

        <ToolbarButton
          tooltip="Share screen"
          highlighted={state.isScreenSharing}
          onPress={onToggleScreenShare}
        >
          <ScreenShare size={20} color={state.isScreenSharing ? "#7091E6" : "#e5e7eb"} />
        </ToolbarButton>

        <ToolbarButton
          tooltip="Chat"
          highlighted={state.isChatOpen}
          badge={state.unreadChatCount}
          onPress={onToggleChat}
        >
          <MessageSquare size={20} color={state.isChatOpen ? "#7091E6" : "#e5e7eb"} />
        </ToolbarButton>

        <ToolbarButton
          tooltip={state.isTileView ? "Speaker view" : "Tile view"}
          highlighted={state.isTileView}
          onPress={onToggleTileView}
        >
          <Grid2X2 size={20} color={state.isTileView ? "#7091E6" : "#e5e7eb"} />
        </ToolbarButton>

        <View width={1} height={24} backgroundColor="rgba(255,255,255,0.1)" marginHorizontal={4} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave meeting"
          onPress={onHangup}
          style={({ pressed, hovered }) => ({
            width: 56,
            height: 40,
            borderRadius: 8,
            backgroundColor: pressed || hovered ? "#ef4444" : "#dc2626",
            alignItems: "center",
            justifyContent: "center",
            transform: pressed ? [{ scale: 0.95 }] : undefined,
          })}
        >
          <PhoneOff size={20} color="#fff" />
        </Pressable>
      </XStack>
    </XStack>
  );
}
