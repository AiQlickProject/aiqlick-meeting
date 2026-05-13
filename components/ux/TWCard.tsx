import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { View, XStack, YStack } from "tamagui";

import { aiqlickTokens } from "@/tamagui.config";

type Shadow = "none" | "sm" | "md" | "lg";

interface CardProps {
  shadow?: Shadow;
  isHoverable?: boolean;
  onPress?: () => void;
  children: ReactNode;
}

const SHADOWS: Record<Shadow, { opacity: number; radius: number; offset: number }> = {
  none: { opacity: 0, radius: 0, offset: 0 },
  sm: { opacity: 0.06, radius: 6, offset: 2 },
  md: { opacity: 0.1, radius: 12, offset: 4 },
  lg: { opacity: 0.15, radius: 24, offset: 8 },
};

/**
 * White surface card. Mirrors `<TWCard shadow="sm" isHoverable>` from
 * the frontend — same border, same shadow scale, same hover lift.
 */
export function TWCard({ shadow = "sm", isHoverable, onPress, children }: CardProps) {
  const s = SHADOWS[shadow];
  const content = (
    <View
      borderRadius={aiqlickTokens.radiusXl}
      backgroundColor={aiqlickTokens.surface}
      borderWidth={1}
      borderColor={aiqlickTokens.gray200}
      shadowColor="#1A2556"
      shadowOpacity={s.opacity}
      shadowRadius={s.radius}
      shadowOffset={{ width: 0, height: s.offset }}
      overflow="hidden"
    >
      {children}
    </View>
  );

  if (!onPress && !isHoverable) return content;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }) => ({
        borderRadius: aiqlickTokens.radiusXl,
        transform: pressed ? [{ scale: 0.995 }] : undefined,
        shadowColor: "#1A2556",
        shadowOpacity: hovered ? Math.min(s.opacity * 1.8, 0.18) : s.opacity,
        shadowRadius: hovered ? s.radius * 1.4 : s.radius,
        shadowOffset: { width: 0, height: hovered ? s.offset * 1.5 : s.offset },
      })}
    >
      <View
        borderRadius={aiqlickTokens.radiusXl}
        backgroundColor={aiqlickTokens.surface}
        borderWidth={1}
        borderColor={aiqlickTokens.gray200}
        overflow="hidden"
      >
        {children}
      </View>
    </Pressable>
  );
}

export function TWCardHeader({ children }: { children: ReactNode }) {
  return (
    <XStack
      paddingHorizontal={16}
      paddingVertical={12}
      alignItems="center"
      justifyContent="space-between"
      gap={8}
    >
      {children}
    </XStack>
  );
}

export function TWCardBody({ children, gap = 12 }: { children: ReactNode; gap?: number }) {
  return (
    <YStack paddingHorizontal={16} paddingVertical={12} gap={gap}>
      {children}
    </YStack>
  );
}

export function TWCardFooter({ children }: { children: ReactNode }) {
  return (
    <XStack
      paddingHorizontal={16}
      paddingVertical={12}
      alignItems="center"
      gap={8}
      borderTopWidth={1}
      borderColor={aiqlickTokens.gray100}
    >
      {children}
    </XStack>
  );
}

export function TWDivider() {
  return <View height={1} backgroundColor={aiqlickTokens.gray100} />;
}
