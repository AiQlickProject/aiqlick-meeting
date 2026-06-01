import { MicOff } from "@tamagui/lucide-icons";
import { Pressable } from "react-native";
import { XStack, Text } from "tamagui";

import { aiqlickTokens } from "@/tamagui.config";

interface Props {
  /**
   * Called when the user clicks the "Change my mind" link inside the
   * banner. Triggers the consent modal to re-open.
   */
  onReopen: () => void;
}

/**
 * Persistent banner shown above the toolbar when the local user
 * declined AI transcription consent. They're force-muted in that
 * state, so we surface a one-line reminder + a path back to the
 * consent prompt in case they change their mind mid-meeting.
 */
export function MeetingConsentBanner({ onReopen }: Props) {
  return (
    <XStack
      alignSelf="center"
      paddingHorizontal={14}
      paddingVertical={8}
      gap={10}
      borderRadius={9999}
      backgroundColor="rgba(15, 23, 42, 0.85)"
      borderWidth={1}
      borderColor="rgba(255, 255, 255, 0.10)"
      alignItems="center"
    >
      <MicOff size={14} color="#fbbf24" />
      <Text color="#f1f5f9" fontSize={12} fontWeight="600">
        Muted — AI transcription declined.
      </Text>
      <Pressable
        onPress={onReopen}
        accessibilityRole="button"
        accessibilityLabel="Change my mind about transcription consent"
        style={({ pressed, hovered }: any) => ({
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 6,
          backgroundColor:
            pressed || hovered ? "rgba(255, 255, 255, 0.12)" : "transparent",
        })}
      >
        <Text color={aiqlickTokens.primary} fontSize={12} fontWeight="700">
          Change my mind
        </Text>
      </Pressable>
    </XStack>
  );
}
