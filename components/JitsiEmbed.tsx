import { forwardRef, useEffect, useState } from "react";
import { JitsiMeeting } from "@jitsi/react-native-sdk";
import { StyleSheet } from "react-native";

import type {
  JitsiEmbedProps,
  NativeJitsiMeetingProps,
  NativeJitsiRef,
} from "@/hooks/jitsi-types";

/**
 * Wrapper that only renders the native Jitsi SDK component after
 * hydration — prevents SSR/hydration mismatch since the JitsiMeeting
 * component cannot be server-rendered.
 */
function NativeMeetingClientOnly(
  props: NativeJitsiMeetingProps & { meetingRef: NativeJitsiRef },
) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Delay one tick so we're firmly in client-only territory
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return <NativeMeeting {...props} ref={props.meetingRef} />;
}

const NativeMeeting = forwardRef<NativeJitsiRef, NativeJitsiMeetingProps>(
  function NativeMeeting(props, ref) {
    return (
      <JitsiMeeting
        ref={ref}
        room={props.roomName}
        serverURL={`https://${props.domain}`}
        token={props.jwt ?? undefined}
        userInfo={
          props.displayName
            ? { displayName: props.displayName, email: "", avatarURL: "" }
            : undefined
        }
        config={{
          prejoinPageEnabled: false,
          prejoinConfig: { enabled: false },
          disableDeepLinking: true,
          hideConferenceSubject: true,
          hideConferenceTimer: true,
          hideParticipantsStats: true,
          startInTileView: true,
          noiseSuppression: {
            enabled: true,
          },
          transcription: {
            enabled: true,
            autoStartTranscription: true,
            autoCaptionOnTranscribe: true,
            disableStartForAll: false,
          },
          notifications: [],
          disableThirdPartyRequests: true,
          disableProfile: true,
          disableReactions: true,
          disablePolls: true,
          toolbarButtons: [],
          participantsPane: { enabled: false },
        }}
        flags={{
          "call-integration.enabled": true,
          "pip.enabled": true,
          "welcomepage.enabled": false,
        }}
        eventListeners={{
          onConferenceWillJoin: () => props.onStateChange({ error: null }),
          onConferenceJoined: () =>
            props.onStateChange({
              isJoined: true,
              participantCount: 1,
              participants: props.displayName
                ? [
                    {
                      id: "local",
                      displayName: props.displayName,
                      audioMuted: false,
                      videoMuted: false,
                      isLocal: true,
                    },
                  ]
                : [],
            }),
          onConferenceLeft: () => props.onStateChange({ isJoined: false }),
          onReadyToClose: () => props.onStateChange({ isJoined: false }),
          onParticipantJoined: () =>
            props.onStateChange({ participantCount: 2 }),
        }}
        style={styles.meeting}
      />
    );
  },
);

export default function JitsiEmbed({ nativeMeetingProps }: JitsiEmbedProps) {
  if (!nativeMeetingProps) {
    return null;
  }

  return (
    <NativeMeetingClientOnly
      {...nativeMeetingProps}
      meetingRef={nativeMeetingProps.meetingRef}
    />
  );
}

const styles = StyleSheet.create({
  meeting: {
    flex: 1,
  },
});
