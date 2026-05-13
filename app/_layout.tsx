import { ApolloProvider } from "@apollo/client";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { TamaguiProvider, Theme } from "tamagui";

import { UserAuthProvider } from "@/contexts/UserAuthProvider";
import { apolloClient } from "@/lib/apollo";
import tamaguiConfig from "@/tamagui.config";

/**
 * Root layout. Wraps every route in Tamagui's provider with the dark
 * aiqlick theme, Apollo Client against the aiqlick-backend GraphQL
 * API, and the auth context (mirrors `UserAuthProvider` in
 * aiqlick-frontend). The meeting client is always-dark — there's no
 * light mode (you're staring at people on video, dark UI reduces
 * glare).
 */
export default function RootLayout() {
  return (
    <ApolloProvider client={apolloClient}>
      <UserAuthProvider>
        <TamaguiProvider config={tamaguiConfig} defaultTheme="dark">
          <Theme name="dark">
            <StatusBar style="light" />
            <Slot />
          </Theme>
        </TamaguiProvider>
      </UserAuthProvider>
    </ApolloProvider>
  );
}
