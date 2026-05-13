import { useRouter } from "expo-router";
import { useEffect, type ReactNode } from "react";
import { ActivityIndicator } from "react-native";
import { YStack } from "tamagui";

import { useUserAuth } from "@/contexts/UserAuthProvider";

/**
 * Redirects to `/login` when the auth context says we have no user
 * and the token check has finished. While we're still loading the
 * token from storage or running `WHO_AM_I`, we render a spinner
 * placeholder so the page doesn't flicker between the login screen
 * and the protected content on a refresh.
 */
export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { loading, isLoggedIn } = useUserAuth();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/login");
    }
  }, [loading, isLoggedIn, router]);

  if (loading || !isLoggedIn) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
        <ActivityIndicator color="#7091E6" />
      </YStack>
    );
  }

  return <>{children}</>;
}
