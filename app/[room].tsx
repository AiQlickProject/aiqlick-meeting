import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { XStack, YStack } from "tamagui";

import InsightsPanel from "@/components/InsightsPanel";
import InviteToast from "@/components/InviteToast";
import ParticipantsPanel from "@/components/ParticipantsPanel";

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

  const { state, commands, attachContainer } = useJitsi({
    roomName: room ?? "",
    jwt: jwtStr,
    displayName: resolvedDisplayName,
  });

  // Once the iframe reports the conference has been left (hangup, kick,
  // or remote close), navigate back to the meetings list. Otherwise our
  // wrapper sits over an iframe that has navigated to Jitsi's `/`
  // dashboard and any further toolbar action re-creates a half-broken
  // session against an iframe that's already moved on.
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
    // Jitsi fires `videoConferenceLeft` after `hangup`; the effect above
    // catches it and navigates. We also navigate immediately so the user
    // never sees the bare Jitsi landing for the brief moment between
    // hangup and the event firing.
    router.replace("/");
  }, [commands, router]);

  const [inviteStatus, setInviteStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  const meetingIdStr = typeof meetingId === "string" ? meetingId : null;

  const handleInvite = useCallback(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    // Strip the JWT before sharing — never leak the token in a copied link.
    const url = new URL(window.location.href);
    url.searchParams.delete("jwt");
    const shareUrl = url.toString();
    void (async () => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareUrl);
        } else {
          throw new Error("Clipboard API unavailable");
        }
        setInviteStatus("copied");
      } catch {
        setInviteStatus("failed");
      }
      setTimeout(() => setInviteStatus("idle"), 2500);
    })();
  }, []);

  // Build the JWT-stripped share URL once per render so ParticipantsPanel
  // can hand it straight to the clipboard without re-doing the parse.
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

  // Only one side panel is visible at a time. Toggling one closes the
  // other so the video stage doesn't get squeezed below a usable size.
  const sidePanel: "participants" | "insights" | null = state.isParticipantsOpen
    ? "participants"
    : isInsightsOpen
      ? "insights"
      : null;

  return (
    <YStack flex={1} backgroundColor="$background">
      <MeetingHeader
        title={title}
        participantCount={state.participantCount}
        isJoined={state.isJoined}
        isModerator={decodeJwtIsModerator(jwtStr)}
      />

      {/* Body is a horizontal flex — video stage on the left, optional
          side panel on the right. The iframe shrinks naturally because
          its parent is `flex: 1` and the panel is a fixed width sibling. */}
      <XStack flex={1}>
        <YStack flex={1} position="relative">
          <JitsiEmbed attachContainer={attachContainer} />

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
              onToggleTileView={commands.toggleTileView}
              onToggleChat={commands.toggleChat}
              onToggleParticipants={() => {
                if (isInsightsOpen) setIsInsightsOpen(false);
                commands.toggleParticipants();
              }}
              onToggleRaiseHand={commands.toggleRaiseHand}
              onToggleInsights={() => {
                if (state.isParticipantsOpen) commands.toggleParticipants();
                setIsInsightsOpen((v) => !v);
              }}
              insightsOpen={isInsightsOpen}
              onInvite={handleInvite}
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
      </XStack>

      <InviteToast status={inviteStatus} />
    </YStack>
  );
}
