import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator } from "react-native";
import { YStack, Text } from "tamagui";

/**
 * Landing route. The meeting client is only useful when you arrive
 * with a room slug in the URL (web) or via a deep link (native).
 * If someone lands on `/` directly, show a brief explainer.
 *
 * In production aiqlick-frontend always opens this app at
 * `/<roomname>?jwt=…`, so the bare landing is just for safety.
 */
export default function Index() {
  const router = useRouter();

  // If a `?room=` query slipped onto the root, forward to the room
  // route — useful for older bookmarks.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const room = new URLSearchParams(window.location.search).get("room");
    if (room) router.replace(`/${room}` as never);
  }, [router]);

  return (
    <>
      <Stack.Screen options={{ title: "Aiqlick Meeting" }} />
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        gap="$3"
        padding="$6"
        backgroundColor="$background"
      >
        <ActivityIndicator color="#7091E6" />
        <Text color="$color" fontSize="$5" fontWeight="600">
          Aiqlick Meeting
        </Text>
        <Text color="$gray9" fontSize="$3" textAlign="center" maxWidth={420}>
          Open this app with a room slug in the URL, e.g.{" "}
          <Text fontFamily="$mono" fontSize="$3" color="$color">
            /your-room-name
          </Text>
          . You normally arrive here by clicking &quot;Join&quot; in the
          Aiqlick dashboard.
        </Text>
      </YStack>
    </>
  );
}
