import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { XStack, YStack } from "tamagui";

import ChatPanel from "@/components/ChatPanel";
import InsightsPanel from "@/components/InsightsPanel";
import ParticipantsPanel from "@/components/ParticipantsPanel";
import ReactionsOverlay from "@/components/ReactionsOverlay";
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
 *
 * SSR is disabled because:
 * - Tamagui uses browser-only APIs (window, document) that fail on server
 * - The Jitsi iframe API can only run in a browser
 * - Auth state lives in localStorage / SecureStore which is async
 * - Hydration mismatches if any date/time is rendered server vs client
 */
export const ssr = false;
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

  // Only one side panel is visible at a time. Opening any one closes
  // the others so the video stage never collapses below usable size.
  // Chat joins the same rota as participants / insights / transcript.
  const handleToggleChat = useCallback(() => {
    const willOpen = !state.isChatOpen;
    if (willOpen) {
      if (state.isParticipantsOpen) commands.toggleParticipants();
      setIsInsightsOpen(false);
      setIsTranscriptOpen(false);
    }
    commands.toggleChat();
  }, [commands, state.isChatOpen, state.isParticipantsOpen]);

  const handleToggleParticipants = useCallback(() => {
    const willOpen = !state.isParticipantsOpen;
    if (willOpen) {
      if (state.isChatOpen) commands.toggleChat();
      setIsInsightsOpen(false);
      setIsTranscriptOpen(false);
    }
    commands.toggleParticipants();
  }, [commands, state.isChatOpen, state.isParticipantsOpen]);

  const handleToggleTranscript = useCallback(() => {
    const willOpen = !isTranscriptOpen;
    if (willOpen) {
      if (state.isChatOpen) commands.toggleChat();
      if (state.isParticipantsOpen) commands.toggleParticipants();
      setIsInsightsOpen(false);
    }
    setIsTranscriptOpen((v) => !v);
  }, [commands, isTranscriptOpen, state.isChatOpen, state.isParticipantsOpen]);

  const handleToggleInsights = useCallback(() => {
    const willOpen = !isInsightsOpen;
    if (willOpen) {
      if (state.isChatOpen) commands.toggleChat();
      if (state.isParticipantsOpen) commands.toggleParticipants();
      setIsTranscriptOpen(false);
    }
    setIsInsightsOpen((v) => !v);
  }, [commands, isInsightsOpen, state.isChatOpen, state.isParticipantsOpen]);

  const sidePanel:
    | "chat"
    | "participants"
    | "insights"
    | "transcript"
    | null = state.isChatOpen
    ? "chat"
    : state.isParticipantsOpen
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

          {/* Floating reaction toasts — sit above the iframe but
              below the toolbar's tooltips. Driven entirely by
              state.recentReactions which is fed from sendReaction +
              endpointTextMessageReceived. */}
          <ReactionsOverlay reactions={state.recentReactions} />

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
              onToggleChat={handleToggleChat}
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

        {sidePanel === "chat" && (
          <YStack width={340} backgroundColor="$background">
            <ChatPanel
              state={state}
              onClose={handleToggleChat}
              onSend={commands.sendChatMessage}
            />
          </YStack>
        )}
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
