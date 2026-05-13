import type { MutableRefObject } from "react";

/**
 * Shared types between the platform implementations of the Jitsi
 * embed. Keeping the contract explicit means the outer React
 * components never have to branch on platform.
 */

export interface JitsiState {
  isJoined: boolean;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  isTileView: boolean;
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  participantCount: number;
  unreadChatCount: number;
  error: string | null;
}

export interface JitsiCommands {
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  toggleTileView: () => void;
  toggleChat: () => void;
  hangup: () => void;
}

export type JitsiCommandName =
  | "toggleAudio"
  | "toggleVideo"
  | "toggleScreenShare"
  | "toggleTileView"
  | "toggleChat"
  | "hangup";

export interface JitsiEmbedHandle {
  /** Returns a DOM element ref the web iframe can mount into. */
  attach: (el: HTMLElement | null) => void;
  execute: (command: JitsiCommandName) => void;
  dispose: () => void;
}

export type JitsiEmbedRef = MutableRefObject<JitsiEmbedHandle | null>;

export interface CreateJitsiEmbedArgs {
  domain: string;
  roomName: string;
  jwt?: string | null;
  displayName?: string | null;
  onStateChange: (patch: Partial<JitsiState>) => void;
}
