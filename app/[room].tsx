import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { XStack, YStack } from "tamagui";

import InsightsPanel from "@/components/InsightsPanel";
import ParticipantsPanel from "@/components/ParticipantsPanel";
import TranscriptPanel from "@/components/TranscriptPanel";

import MeetingHeader from "@/components/MeetingHeader";
import MeetingToolbar from "@/components/MeetingToolbar";
import JitsiEmbed from "@/components/JitsiEmbed";
import { useJitsi } from "@/hooks/useJitsi";
import {
  decodeJwtDisplayName,
  decodeJwtIsModerator,
  decodeJwtSubject,
  humanizeRoomName,
} from "@/lib/parse-url";

/**
 * The meeting view. Renders our aiqlick chrome (header + toolbar)
 * around the Jitsi session. The session is delivered by the platform-
 * specific JitsiEmbed:
 *
 *   web    → <iframe> via Jitsi IFrame API
 *   ios    → @jitsi/react-native-sdk's native bridge
 *   android  same
 *
 * `useJitsi` exposes the same shape regardless of platform; the
 * outer UI is written once.
 */
export default function MeetingRoute() {
  const {
    room: rawRoom,
    jwt,
    subject,
    displayName,
    meetingId,
  } = useLocalSearchParams<{
    room: string | string[];
    jwt?: string;
    subject?: string;
    displayName?: string;
    meetingId?: string;
  }>();

  const room = Array.isArray(rawRoom) ? rawRoom[0] : rawRoom;
  const jwtStr = typeof jwt === "string" ? jwt : null;
  const title = (
    subject ||
    decodeJwtSubject(jwtStr) ||
    humanizeRoomName(room ?? "") ||
    "Aiqlick Meeting"
  ).trim();

  const resolvedDisplayName =
    (typeof displayName === "string" ? displayName : null) ||
    decodeJwtDisplayName(jwtStr);

  const { state, commands, attachContainer, nativeMeetingProps } = useJitsi({
    roomName: room ?? "",
    jwt: jwtStr,
    displayName: resolvedDisplayName,
  });

  const router = useRouter();
  const wasJoined = useRef(false);
  useEffect(() => {
    if (state.isJoined) {
      wasJoined.current = true;
      return;
    }
    if (wasJoined.current && !state.isJoined) {
      wasJoined.current = false;
      router.replace("/");
    }
  }, [state.isJoined, router]);

  const handleHangup = useCallback(() => {
    commands.hangup();
    router.replace("/");
  }, [commands, router]);

  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);

  const meetingIdStr = typeof meetingId === "string" ? meetingId : null;

  // Build the JWT-stripped share URL once per render so ParticipantsPanel
  // can hand it straight to the clipboard. The invite button used to live
  // on the toolbar too; it now only exists inside the People panel.
  const shareUrl = (() => {
    if (typeof window === "undefined") return "";
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("jwt");
      return u.toString();
    } catch {
      return "";
    }
  })();

  const handleToggleParticipants = useCallback(() => {
    if (isInsightsOpen) setIsInsightsOpen(false);
    if (isTranscriptOpen) setIsTranscriptOpen(false);
    commands.toggleParticipants();
  }, [commands, isInsightsOpen, isTranscriptOpen]);

  const handleToggleTranscript = useCallback(() => {
    if (state.isParticipantsOpen) commands.toggleParticipants();
    if (isInsightsOpen) setIsInsightsOpen(false);
    setIsTranscriptOpen((v) => !v);
  }, [commands, isInsightsOpen, state.isParticipantsOpen]);

  const handleToggleInsights = useCallback(() => {
    if (state.isParticipantsOpen) commands.toggleParticipants();
    if (isTranscriptOpen) setIsTranscriptOpen(false);
    setIsInsightsOpen((v) => !v);
  }, [commands, isTranscriptOpen, state.isParticipantsOpen]);

  // Only one side panel is visible at a time. Toggling one closes the
  // others so the video stage doesn't get squeezed below a usable size.
  const sidePanel: "participants" | "insights" | "transcript" | null =
    state.isParticipantsOpen
      ? "participants"
      : isInsightsOpen
        ? "insights"
        : isTranscriptOpen
          ? "transcript"
          : null;

  return (
    <YStack flex={1} backgroundColor="$background">
      <MeetingHeader
        title={title}
        participantCount={state.participantCount}
        isJoined={state.isJoined}
        isModerator={decodeJwtIsModerator(jwtStr)}
        isRecording={state.isRecording}
        networkQuality={state.networkQuality}
      />

      <XStack flex={1}>
        <YStack flex={1} position="relative">
          <JitsiEmbed
            attachContainer={attachContainer}
            nativeMeetingProps={nativeMeetingProps}
          />

          <YStack
            position="absolute"
            left={0}
            right={0}
            bottom={0}
            paddingBottom="$3"
            pointerEvents="box-none"
          >
            <MeetingToolbar
              state={state}
              onToggleAudio={commands.toggleAudio}
              onToggleVideo={commands.toggleVideo}
              onToggleScreenShare={commands.toggleScreenShare}
              onSetLayout={commands.setLayout}
              onToggleChat={commands.toggleChat}
              onToggleParticipants={handleToggleParticipants}
              onToggleRaiseHand={commands.toggleRaiseHand}
              onSendReaction={commands.sendReaction}
              onToggleTranscript={handleToggleTranscript}
              transcriptOpen={isTranscriptOpen}
              onToggleInsights={handleToggleInsights}
              insightsOpen={isInsightsOpen}
              onToggleBlur={commands.toggleBlur}
              onToggleNoiseSuppression={commands.toggleNoiseSuppression}
              onPickAudioInput={commands.setAudioInputDevice}
              onPickAudioOutput={commands.setAudioOutputDevice}
              onPickVideoInput={commands.setVideoInputDevice}
              onHangup={handleHangup}
            />
          </YStack>
        </YStack>

        {sidePanel === "participants" && (
          <YStack width={340} backgroundColor="$background">
            <ParticipantsPanel
              state={state}
              onClose={commands.toggleParticipants}
              inviteUrl={shareUrl}
            />
          </YStack>
        )}
        {sidePanel === "insights" && (
          <YStack width={360} backgroundColor="$background">
            <InsightsPanel
              meetingId={meetingIdStr}
              isOpen
              onClose={() => setIsInsightsOpen(false)}
            />
          </YStack>
        )}
        {sidePanel === "transcript" && (
          <YStack width={360} backgroundColor="$background">
            <TranscriptPanel
              state={state}
              onClose={() => setIsTranscriptOpen(false)}
              onSetCaptions={commands.setSubtitles}
              filenameBase={title}
            />
          </YStack>
        )}
      </XStack>
    </YStack>
  );
}
