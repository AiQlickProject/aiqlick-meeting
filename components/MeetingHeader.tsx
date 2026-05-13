import { useEffect, useState } from "react";
import { Video, Users } from "@tamagui/lucide-icons";
import { Circle, View, XStack, YStack, Text } from "tamagui";

interface Props {
  title: string;
  participantCount: number;
  isJoined: boolean;
}

/**
 * Top header bar. Primary-tinted icon + meeting title + status,
 * live timer in the centre, participant count on the right. Mirrors
 * the aiqlick-frontend `MeetingHeader` so the meeting feels
 * continuous with the rest of the product on every platform.
 */
export default function MeetingHeader({ title, participantCount, isJoined }: Props) {
  const elapsed = useElapsedSeconds(isJoined);
  return (
    <XStack
      height={56}
      paddingHorizontal="$5"
      alignItems="center"
      justifyContent="space-between"
      backgroundColor="$background"
      borderBottomWidth={1}
      borderColor="$gray3"
    >
      <XStack alignItems="center" gap="$3" flexShrink={1}>
        <View
          width={32}
          height={32}
          borderRadius={8}
          backgroundColor="rgba(61, 82, 160, 0.2)"
          alignItems="center"
          justifyContent="center"
        >
          <Video size={16} color="#7091E6" />
        </View>
        <YStack flexShrink={1}>
          <Text color="$color" fontSize={14} fontWeight="600" numberOfLines={1}>
            {title}
          </Text>
          <XStack alignItems="center" gap={6}>
            <Circle size={6} backgroundColor="#22c55e" />
            <Text color="$gray9" fontSize={11}>
              {isJoined ? "Connected" : "Connecting…"}
            </Text>
          </XStack>
        </YStack>
      </XStack>

      <XStack
        alignItems="center"
        gap={8}
        paddingHorizontal={16}
        paddingVertical={6}
        borderRadius={9999}
        backgroundColor="rgba(31, 41, 55, 0.6)"
        borderWidth={1}
        borderColor="rgba(55, 65, 81, 0.5)"
      >
        <Circle size={6} backgroundColor="#ef4444" />
        <Text color="$color" fontSize={14} fontFamily="$mono" letterSpacing={1.5}>
          {isJoined ? formatTime(elapsed) : "--:--"}
        </Text>
      </XStack>

      <XStack
        alignItems="center"
        gap={8}
        paddingHorizontal={12}
        paddingVertical={6}
        borderRadius={9999}
        backgroundColor="rgba(31, 41, 55, 0.6)"
        borderWidth={1}
        borderColor="rgba(55, 65, 81, 0.5)"
      >
        <Users size={16} color="#9ca3af" />
        <Text color="$color" fontSize={14} fontWeight="500">
          {participantCount}
        </Text>
      </XStack>
    </XStack>
  );
}

function useElapsedSeconds(isRunning: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!isRunning) {
      setSeconds(0);
      return;
    }
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);
  return seconds;
}

function formatTime(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
