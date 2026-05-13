import { Check, X } from "@tamagui/lucide-icons";
import { XStack, Text } from "tamagui";

interface Props {
  status: "idle" | "copied" | "failed";
}

/**
 * Small confirmation toast shown after the user taps the invite
 * button. Sits just above the toolbar; auto-hides via the parent
 * after a couple of seconds.
 */
export default function InviteToast({ status }: Props) {
  if (status === "idle") return null;
  const failed = status === "failed";
  return (
    <XStack
      position="absolute"
      left={0}
      right={0}
      bottom={88}
      justifyContent="center"
      pointerEvents="none"
    >
      <XStack
        alignItems="center"
        gap={8}
        paddingHorizontal={14}
        paddingVertical={10}
        borderRadius={9999}
        backgroundColor={failed ? "rgba(220, 38, 38, 0.95)" : "rgba(17, 24, 39, 0.95)"}
        borderWidth={1}
        borderColor={failed ? "rgba(248, 113, 113, 0.5)" : "rgba(255,255,255,0.08)"}
      >
        {failed ? (
          <X size={16} color="#fff" />
        ) : (
          <Check size={16} color="#22c55e" />
        )}
        <Text color="#fff" fontSize={13} fontWeight="500">
          {failed ? "Could not copy link" : "Invite link copied"}
        </Text>
      </XStack>
    </XStack>
  );
}
