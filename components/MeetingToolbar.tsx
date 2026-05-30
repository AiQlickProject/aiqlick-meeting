import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  MessageSquare,
  MoreHorizontal,
  LayoutGrid,
  Smile,
  Users,
  FileText,
  PhoneOff,
} from "@tamagui/lucide-icons";
import { Pressable } from "react-native";
import { View, XStack } from "tamagui";

import ToolbarButton from "./ToolbarButton";
import ToolbarMenuButton from "./toolbar/ToolbarMenuButton";
import SplitToolbarButton from "./toolbar/SplitToolbarButton";
import ReactionsMenu from "./toolbar/ReactionsMenu";
import ViewMenu from "./toolbar/ViewMenu";
import MoreMenu from "./toolbar/MoreMenu";
import DeviceMenu from "./toolbar/DeviceMenu";

import type {
  JitsiState,
  LayoutMode,
  MediaDevice,
  ReactionKind,
} from "@/hooks/jitsi-types";

interface Props {
  state: JitsiState;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onSetLayout: (mode: LayoutMode) => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onToggleRaiseHand: () => void;
  onSendReaction: (kind: ReactionKind) => void;
  onToggleTranscript: () => void;
  transcriptOpen?: boolean;
  onToggleInsights: () => void;
  insightsOpen?: boolean;
  onToggleBlur: () => void;
  onToggleNoiseSuppression: () => void;
  onPickAudioInput: (d: MediaDevice) => void;
  onPickAudioOutput: (d: MediaDevice) => void;
  onPickVideoInput: (d: MediaDevice) => void;
  onHangup: () => void;
}

/**
 * Bottom toolbar — Teams-style three-cluster layout inside a single
 * dark pill. Left cluster carries the conversational tools (Chat,
 * People, Reactions). Center cluster carries the media controls (Mic,
 * Cam, Share). Right cluster carries view and overflow plus the Leave
 * button. Reactions and View collapse what used to be standalone
 * top-level icons (raise hand, tile/speaker, captions, insights,
 * invite); see toolbar/* for the popovers.
 */
export default function MeetingToolbar({
  state,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onSetLayout,
  onToggleChat,
  onToggleParticipants,
  onToggleRaiseHand,
  onSendReaction,
  onToggleTranscript,
  transcriptOpen,
  onToggleInsights,
  insightsOpen,
  onToggleBlur,
  onToggleNoiseSuppression,
  onPickAudioInput,
  onPickAudioOutput,
  onPickVideoInput,
  onHangup,
}: Props) {
  const layout: LayoutMode = state.isTileView ? "tile" : "speaker";

  return (
    <XStack justifyContent="center" pointerEvents="box-none">
      <XStack
        alignItems="center"
        gap={6}
        paddingHorizontal={10}
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
        {/* Left cluster — conversational tools */}
        <XStack alignItems="center" gap={4}>
          <ToolbarButton
            tooltip="Chat"
            highlighted={state.isChatOpen}
            badge={state.unreadChatCount}
            onPress={onToggleChat}
          >
            <MessageSquare size={20} color={state.isChatOpen ? "#7091E6" : "#e5e7eb"} />
          </ToolbarButton>
          <ToolbarButton
            tooltip="People"
            highlighted={state.isParticipantsOpen}
            onPress={onToggleParticipants}
          >
            <Users size={20} color={state.isParticipantsOpen ? "#7091E6" : "#e5e7eb"} />
          </ToolbarButton>
          <ToolbarMenuButton
            tooltip="Reactions"
            highlighted={state.isHandRaised}
            icon={
              <Smile size={20} color={state.isHandRaised ? "#7091E6" : "#e5e7eb"} />
            }
            menuWidth={280}
          >
            {(close) => (
              <ReactionsMenu
                isHandRaised={state.isHandRaised}
                onReact={onSendReaction}
                onToggleRaiseHand={onToggleRaiseHand}
                close={close}
              />
            )}
          </ToolbarMenuButton>
          <ToolbarButton
            tooltip="Live transcript"
            highlighted={transcriptOpen}
            onPress={onToggleTranscript}
          >
            <FileText size={20} color={transcriptOpen ? "#7091E6" : "#e5e7eb"} />
          </ToolbarButton>
        </XStack>

        <Divider />

        {/* Center cluster — media controls */}
        <XStack alignItems="center" gap={4}>
          <SplitToolbarButton
            tooltip={state.isAudioMuted ? "Unmute" : "Mute"}
            caretTooltip="Audio devices"
            active={state.isAudioMuted}
            icon={
              state.isAudioMuted ? (
                <MicOff size={20} color="#fff" />
              ) : (
                <Mic size={20} color="#e5e7eb" />
              )
            }
            onPress={onToggleAudio}
          >
            {(close) => (
              <DeviceMenu
                kind="audio"
                devices={state.availableDevices}
                selected={state.selectedDevices}
                onPickAudioInput={onPickAudioInput}
                onPickAudioOutput={onPickAudioOutput}
                onPickVideoInput={onPickVideoInput}
                close={close}
              />
            )}
          </SplitToolbarButton>
          <SplitToolbarButton
            tooltip={state.isVideoMuted ? "Start video" : "Stop video"}
            caretTooltip="Video devices"
            active={state.isVideoMuted}
            icon={
              state.isVideoMuted ? (
                <VideoOff size={20} color="#fff" />
              ) : (
                <Video size={20} color="#e5e7eb" />
              )
            }
            onPress={onToggleVideo}
          >
            {(close) => (
              <DeviceMenu
                kind="video"
                devices={state.availableDevices}
                selected={state.selectedDevices}
                onPickAudioInput={onPickAudioInput}
                onPickAudioOutput={onPickAudioOutput}
                onPickVideoInput={onPickVideoInput}
                close={close}
              />
            )}
          </SplitToolbarButton>
          <ToolbarButton
            tooltip="Share screen"
            highlighted={state.isScreenSharing}
            onPress={onToggleScreenShare}
          >
            <ScreenShare size={20} color={state.isScreenSharing ? "#7091E6" : "#e5e7eb"} />
          </ToolbarButton>
        </XStack>

        <Divider />

        {/* Right cluster — view, overflow, leave */}
        <XStack alignItems="center" gap={4}>
          <ToolbarMenuButton
            tooltip="View"
            icon={<LayoutGrid size={20} color="#e5e7eb" />}
            menuWidth={240}
          >
            {(close) => (
              <ViewMenu layout={layout} onSetLayout={onSetLayout} close={close} />
            )}
          </ToolbarMenuButton>
          <ToolbarMenuButton
            tooltip="More"
            highlighted={insightsOpen || state.isBlurEnabled || state.isNoiseSuppressionOn}
            icon={<MoreHorizontal size={20} color="#e5e7eb" />}
            menuWidth={280}
            alignRight
          >
            {(close) => (
              <MoreMenu
                isBlurEnabled={state.isBlurEnabled}
                isNoiseSuppressionOn={state.isNoiseSuppressionOn}
                isInsightsOpen={!!insightsOpen}
                onToggleBlur={onToggleBlur}
                onToggleNoiseSuppression={onToggleNoiseSuppression}
                onToggleInsights={onToggleInsights}
                close={close}
              />
            )}
          </ToolbarMenuButton>

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
    </XStack>
  );
}

function Divider() {
  return (
    <View width={1} height={24} backgroundColor="rgba(255,255,255,0.08)" marginHorizontal={2} />
  );
}
