import { YStack, Text } from "tamagui";

import type { JitsiEmbedRef } from "@/hooks/jitsi-types";

interface Props {
  embed: JitsiEmbedRef;
}

/**
 * Native (iOS / Android) Jitsi embed. Placeholder UI while the
 * `@jitsi/react-native-sdk` integration lands. The component
 * signature matches the web sibling so the outer tree doesn't
 * branch on platform.
 */
export default function JitsiEmbed(_: Props) {
  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$gray9"
      gap="$3"
      padding="$6"
    >
      <Text color="$color" fontSize="$5" fontWeight="600">
        Mobile meeting client coming soon
      </Text>
      <Text color="$gray11" fontSize="$3" textAlign="center" maxWidth={420}>
        Native Jitsi rendering on iOS and Android lands in the next
        update. Use the browser version meanwhile.
      </Text>
    </YStack>
  );
}
