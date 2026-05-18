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

export interface JitsiState {
  isJoined: boolean;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  isTileView: boolean;
  isTranscribing: boolean;
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  isHandRaised: boolean;
  participantCount: number;
  participants: ParticipantInfo[];
  unreadChatCount: number;
  error: string | null;
}

export interface JitsiCommands {
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  toggleTileView: () => void;
  toggleChat: () => void;
  toggleParticipants: () => void;
  toggleRaiseHand: () => void;
  hangup: () => void;
}

export type JitsiCommandName =
  | "toggleAudio"
  | "toggleVideo"
  | "toggleScreenShare"
  | "toggleTileView"
  | "toggleChat"
  | "toggleParticipants"
  | "toggleRaiseHand"
  | "hangup";

export interface JitsiEmbedHandle {
  execute: (command: JitsiCommandName) => void;
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
