import { useMutation } from "@apollo/client";
import { LogIn } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image } from "react-native";
import { View, YStack, Text } from "tamagui";

import GradientBackground from "@/components/ui/GradientBackground";
import { TWButton } from "@/components/ux/TWButton";
import { TWInput } from "@/components/ux/TWInput";
import { useUserAuth } from "@/contexts/UserAuthProvider";
import { SIGN_IN, type SignInResult } from "@/graphql/operations/auth";
import { aiqlickTokens } from "@/tamagui.config";

/**
 * Sign-in screen. Visual layout mirrors `SignInForm` in aiqlick-frontend:
 * gradient backdrop, white rounded card with subtle border + glow,
 * underlined floating-label inputs, solid primary CTA. Built entirely
 * on top of our TW* primitives so it tracks any future design-token
 * changes without per-screen edits.
 */
export default function LoginScreen() {
  const router = useRouter();
  const { login } = useUserAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signIn, { loading }] = useMutation<SignInResult>(SIGN_IN);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    try {
      const { data } = await signIn({ variables: { input: { email, password } } });
      const token = data?.signIn.token;
      const temporaryToken = data?.signIn.temporaryToken;
      if (temporaryToken) {
        setError("Two-factor verification is required — complete sign-in on the web frontend.");
        return;
      }
      if (!token) {
        setError(data?.signIn.message || "Could not sign you in.");
        return;
      }
      await login(token);
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed.");
    }
  };

  return (
    <GradientBackground>
      <YStack flex={1} alignItems="center" justifyContent="center" padding={24}>
        <View
          width="100%"
          maxWidth={360}
          padding={28}
          borderRadius={aiqlickTokens.radius2xl}
          backgroundColor={aiqlickTokens.surface}
          borderWidth={1}
          borderColor="rgba(255,255,255,0.6)"
          shadowColor="#1A2556"
          shadowOpacity={0.4}
          shadowRadius={48}
          shadowOffset={{ width: 0, height: 20 }}
        >
          <YStack gap={20}>
            <YStack gap={6} alignItems="center">
              <Image
                source={require("@/assets/icon.png")}
                style={{ width: 48, height: 48, borderRadius: 12 }}
                accessibilityLabel="aiqlick"
                resizeMode="contain"
              />
              <Text color={aiqlickTokens.textDark} fontSize={22} fontWeight="700">
                Welcome back
              </Text>
              <Text color={aiqlickTokens.gray500} fontSize={13} textAlign="center">
                Sign in to your aiqlick account to access your meetings.
              </Text>
            </YStack>

            <YStack gap={14}>
              <TWInput
                label="Email Address"
                variant="underlined"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                isRequired
              />
              <TWInput
                label="Password"
                variant="underlined"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                isRequired
              />
              {error && (
                <Text color={aiqlickTokens.danger} fontSize={12}>
                  {error}
                </Text>
              )}
              <YStack marginTop={4}>
                <TWButton
                  label="Sign In"
                  onPress={onSubmit}
                  isLoading={loading}
                  icon={<LogIn size={16} color="#fff" />}
                  fullWidth
                />
              </YStack>
            </YStack>

            <Text color={aiqlickTokens.gray500} fontSize={11} textAlign="center">
              Sign-up, password reset, and 2FA flows live on the aiqlick web app.
            </Text>
          </YStack>
        </View>
      </YStack>
    </GradientBackground>
  );
}
