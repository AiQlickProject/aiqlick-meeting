declare module "@jitsi/react-native-sdk" {
  import type { ComponentType, RefAttributes } from "react";
  import type { StyleProp, ViewStyle } from "react-native";

  export interface JitsiRefProps {
    close: () => void;
    setAudioMuted: (muted: boolean) => void;
    setVideoMuted: (muted: boolean) => void;
  }

  export interface JitsiMeetingProps {
    room: string;
    serverURL?: string;
    token?: string;
    userInfo?: {
      avatarURL?: string;
      displayName?: string;
      email?: string;
    };
    config?: Record<string, unknown>;
    flags?: Record<string, unknown>;
    eventListeners?: {
      onConferenceBlurred?: () => void;
      onConferenceFocused?: () => void;
      onConferenceJoined?: () => void;
      onConferenceLeft?: () => void;
      onConferenceWillJoin?: () => void;
      onEnterPictureInPicture?: () => void;
      onParticipantJoined?: () => void;
      onReadyToClose?: () => void;
    };
    style?: StyleProp<ViewStyle>;
  }

  export const JitsiMeeting: ComponentType<
    JitsiMeetingProps & RefAttributes<JitsiRefProps>
  >;
}
