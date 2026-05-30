/**
 * Shared types between the platform implementations of the Jitsi
 * embed. Keeping the contract explicit means the outer React
 * components never have to branch on platform.
 */

export interface ParticipantInfo {
  id: string;
  displayName: string;
  audioMuted: boolean;
  videoMuted: boolean;
  isLocal: boolean;
}

export interface TranscriptChunk {
  id: string;
  participantId: string;
  participantName: string;
  text: string;
  isFinal: boolean;
  timestamp: number;
}

export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput" | "videoinput";
  groupId?: string;
}

export interface AvailableDevices {
  audioInput: MediaDevice[];
  audioOutput: MediaDevice[];
  videoInput: MediaDevice[];
}

export interface SelectedDevices {
  audioInput: string | null;
  audioOutput: string | null;
  videoInput: string | null;
}

export type LayoutMode = "tile" | "speaker";
export type NetworkQuality = "good" | "fair" | "poor" | "unknown";
export type ReactionKind =
  | "thumbs-up"
  | "clap"
  | "laugh"
  | "surprised"
  | "boo"
  | "love";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isOwn: boolean;
  isPrivate: boolean;
}

/**
 * A live reaction broadcast across the meeting. Carries the sender name
 * so the ReactionsOverlay can render "Tania reacted 👏" instead of a
 * bare floating emoji. Cleared from state after ~3.5s by the overlay.
 */
export interface ReactionEvent {
  id: string;
  senderId: string;
  senderName: string;
  kind: ReactionKind;
  timestamp: number;
}

export interface JitsiState {
  isJoined: boolean;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  isTileView: boolean;
  isTranscribing: boolean;
  areCaptionsVisible: boolean;
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  isHandRaised: boolean;
  isBlurEnabled: boolean;
  isNoiseSuppressionOn: boolean;
  isRecording: boolean;
  networkQuality: NetworkQuality;
  participantCount: number;
  participants: ParticipantInfo[];
  transcripts: TranscriptChunk[];
  chatMessages: ChatMessage[];
  recentReactions: ReactionEvent[];
  unreadChatCount: number;
  availableDevices: AvailableDevices;
  selectedDevices: SelectedDevices;
  error: string | null;
}

export interface JitsiCommands {
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  toggleTileView: () => void;
  setLayout: (mode: LayoutMode) => void;
  toggleChat: () => void;
  toggleParticipants: () => void;
  toggleRaiseHand: () => void;
  toggleSubtitles: () => void;
  setSubtitles: (visible: boolean) => void;
  sendReaction: (kind: ReactionKind) => void;
  sendChatMessage: (text: string) => void;
  /** Mark all chat messages as read (clears unreadChatCount). Called when the chat panel opens. */
  markChatRead: () => void;
  toggleBlur: () => void;
  toggleNoiseSuppression: () => void;
  setAudioInputDevice: (device: MediaDevice) => void;
  setVideoInputDevice: (device: MediaDevice) => void;
  setAudioOutputDevice: (device: MediaDevice) => void;
  refreshDevices: () => void;
  hangup: () => void;
}

export type JitsiCommandName =
  | "toggleAudio"
  | "toggleVideo"
  | "toggleScreenShare"
  | "toggleTileView"
  | "setLayoutTile"
  | "setLayoutSpeaker"
  | "toggleChat"
  | "toggleParticipants"
  | "toggleRaiseHand"
  | "toggleSubtitles"
  | "setSubtitlesOn"
  | "setSubtitlesOff"
  | "sendReaction"
  | "sendChatMessage"
  | "markChatRead"
  | "toggleBlur"
  | "toggleNoiseSuppression"
  | "setAudioInputDevice"
  | "setVideoInputDevice"
  | "setAudioOutputDevice"
  | "refreshDevices"
  | "hangup";

export interface JitsiEmbedHandle {
  execute: (command: JitsiCommandName, ...args: unknown[]) => void;
  dispose: () => void;
}

/** Callback ref the web embed assigns to its container `<div>`. */
export type AttachContainer = (el: HTMLElement | null) => void;

export interface CreateJitsiEmbedArgs {
  domain: string;
  roomName: string;
  jwt?: string | null;
  displayName?: string | null;
  onStateChange: (patch: Partial<JitsiState>) => void;
}

export interface NativeJitsiRef {
  close?: () => void;
  setAudioMuted?: (muted: boolean) => void;
  setVideoMuted?: (muted: boolean) => void;
}

export interface NativeJitsiMeetingProps extends CreateJitsiEmbedArgs {
  meetingRef: React.RefObject<NativeJitsiRef | null>;
}

export interface JitsiEmbedProps {
  attachContainer: AttachContainer;
  nativeMeetingProps?: NativeJitsiMeetingProps;
}

export const EMPTY_DEVICES: AvailableDevices = {
  audioInput: [],
  audioOutput: [],
  videoInput: [],
};

export const EMPTY_SELECTED_DEVICES: SelectedDevices = {
  audioInput: null,
  audioOutput: null,
  videoInput: null,
};
