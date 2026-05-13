import { Platform } from "react-native";
import { LinearGradient } from "tamagui/linear-gradient";
import { YStack } from "tamagui";
import type { ReactNode } from "react";

/**
 * The signature aiqlick blue gradient — same stops as
 * aiqlick-frontend's `--background-gradient` so every entry screen
 * (login, dashboard) shares the same backdrop.
 */
export default function GradientBackground({
  children,
}: {
  children: ReactNode;
}) {
  // react-native-web supports LinearGradient via expo-linear-gradient/RN
  // but Tamagui's wrapper is the cleanest cross-platform path.
  return (
    <YStack flex={1} backgroundColor="#1A2556">
      {Platform.OS === "web" ? (
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          style={{
            backgroundImage:
              "linear-gradient(135deg, #1A2556 0%, #2A3B7D 20%, #3D52A0 45%, #4B61A8 65%, #5B6FB8 82%, #7091E6 100%)",
          } as { backgroundImage: string }}
        />
      ) : (
        <LinearGradient
          fullscreen
          colors={["#1A2556", "#2A3B7D", "#3D52A0", "#4B61A8", "#5B6FB8", "#7091E6"]}
          start={[0, 0]}
          end={[1, 1]}
        />
      )}
      <YStack flex={1}>{children}</YStack>
    </YStack>
  );
}
