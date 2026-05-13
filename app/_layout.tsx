import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { TamaguiProvider, Theme } from "tamagui";

import tamaguiConfig from "@/tamagui.config";

/**
 * Root layout. Wraps every route in Tamagui's provider with the dark
 * aiqlick theme. The meeting client is always-dark — there's no
 * light mode (you're staring at people on video, dark UI reduces
 * glare).
 */
export default function RootLayout() {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="dark">
      <Theme name="dark">
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#030712" },
            animation: "fade",
          }}
        />
      </Theme>
    </TamaguiProvider>
  );
}
