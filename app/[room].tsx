import { useLocalSearchParams } from "expo-router";
import { YStack } from "tamagui";

import MeetingHeader from "@/components/MeetingHeader";
import MeetingToolbar from "@/components/MeetingToolbar";
import JitsiEmbed from "@/components/JitsiEmbed";
import { useJitsi } from "@/hooks/useJitsi";
import { humanizeRoomName } from "@/lib/parse-url";

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
  const { room: rawRoom, jwt, subject, displayName } = useLocalSearchParams<{
    room: string | string[];
    jwt?: string;
    subject?: string;
    displayName?: string;
  }>();

  const room = Array.isArray(rawRoom) ? rawRoom[0] : rawRoom;
  const title = (subject || humanizeRoomName(room ?? "") || "Aiqlick Meeting").trim();

  const { state, commands, embed } = useJitsi({
    roomName: room ?? "",
    jwt: typeof jwt === "string" ? jwt : null,
    displayName: typeof displayName === "string" ? displayName : null,
  });

  return (
    <YStack flex={1} backgroundColor="$background">
      <MeetingHeader
        title={title}
        participantCount={state.participantCount}
        isJoined={state.isJoined}
      />

      <YStack flex={1} position="relative">
        <JitsiEmbed embed={embed} />

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
            onHangup={commands.hangup}
          />
        </YStack>
      </YStack>
    </YStack>
  );
}
