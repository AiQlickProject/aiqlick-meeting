import type { ReactNode } from "react";
import { ActivityIndicator, Pressable } from "react-native";
import { Text, XStack } from "tamagui";

import { aiqlickTokens } from "@/tamagui.config";

export type TWButtonVariant = "primary" | "outline" | "ghost" | "flat" | "light";
export type TWButtonColor =
  | "primary"
  | "danger"
  | "success"
  | "warning"
  | "secondary"
  | "default";
export type TWButtonSize = "xs" | "sm" | "md" | "lg";

interface Props {
  label?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
  variant?: TWButtonVariant;
  color?: TWButtonColor;
  size?: TWButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  isIconOnly?: boolean;
  onPress?: () => void;
}

const COLORS: Record<
  TWButtonColor,
  { base: string; hover: string; press: string; tint: string; tintHover: string; text: string }
> = {
  primary: {
    base: aiqlickTokens.primary,
    hover: "#4B61A8",
    press: aiqlickTokens.primaryActive,
    tint: "rgba(61, 82, 160, 0.12)",
    tintHover: "rgba(61, 82, 160, 0.20)",
    text: aiqlickTokens.primary,
  },
  danger: {
    base: aiqlickTokens.danger,
    hover: aiqlickTokens.dangerHover,
    press: "#b91c1c",
    tint: "rgba(220, 38, 38, 0.12)",
    tintHover: "rgba(220, 38, 38, 0.20)",
    text: aiqlickTokens.danger,
  },
  success: {
    base: aiqlickTokens.success,
    hover: "#15803d",
    press: "#166534",
    tint: "rgba(22, 163, 74, 0.12)",
    tintHover: "rgba(22, 163, 74, 0.20)",
    text: aiqlickTokens.success,
  },
  warning: {
    base: aiqlickTokens.warning,
    hover: "#b45309",
    press: "#92400e",
    tint: "rgba(217, 119, 6, 0.12)",
    tintHover: "rgba(217, 119, 6, 0.20)",
    text: aiqlickTokens.warning,
  },
  secondary: {
    base: aiqlickTokens.gray700,
    hover: aiqlickTokens.gray800,
    press: aiqlickTokens.gray900,
    tint: aiqlickTokens.gray100,
    tintHover: aiqlickTokens.gray200,
    text: aiqlickTokens.gray700,
  },
  default: {
    base: aiqlickTokens.gray500,
    hover: aiqlickTokens.gray600,
    press: aiqlickTokens.gray700,
    tint: aiqlickTokens.gray100,
    tintHover: aiqlickTokens.gray200,
    text: aiqlickTokens.gray700,
  },
};

const SIZES: Record<TWButtonSize, { height: number; px: number; font: number; iconGap: number }> = {
  xs: { height: 24, px: 8, font: 11, iconGap: 4 },
  sm: { height: 32, px: 12, font: 12, iconGap: 6 },
  md: { height: 40, px: 16, font: 14, iconGap: 8 },
  lg: { height: 48, px: 20, font: 15, iconGap: 8 },
};

/**
 * Cross-platform port of TWButton from aiqlick-frontend. Same prop
 * surface (variant + color + size + isLoading + isIconOnly), same
 * subtle hover lift on web, graceful no-op on native.
 */
export function TWButton({
  label,
  icon,
  iconRight,
  variant = "primary",
  color = "primary",
  size = "md",
  fullWidth,
  disabled,
  isLoading,
  isIconOnly,
  onPress,
}: Props) {
  const c = COLORS[color];
  const s = SIZES[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || isLoading}
      style={({ pressed, hovered }) => {
        const base = (() => {
          if (variant === "primary") return c.base;
          if (variant === "flat" || variant === "light") return c.tint;
          return "transparent";
        })();
        const hover = (() => {
          if (variant === "primary") return c.hover;
          if (variant === "flat" || variant === "light") return c.tintHover;
          return aiqlickTokens.gray100;
        })();
        const press = (() => {
          if (variant === "primary") return c.press;
          return c.tintHover;
        })();
        return {
          height: s.height,
          minWidth: isIconOnly ? s.height : undefined,
          paddingHorizontal: isIconOnly ? 0 : s.px,
          borderRadius: aiqlickTokens.radiusMd,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: s.iconGap,
          alignSelf: fullWidth ? "stretch" : "flex-start",
          backgroundColor: disabled
            ? "rgba(0,0,0,0.06)"
            : pressed
              ? press
              : hovered
                ? hover
                : base,
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: variant === "outline" ? c.base : "transparent",
          opacity: isLoading ? 0.85 : disabled ? 0.6 : 1,
          transform: pressed ? [{ scale: 0.98 }] : hovered && variant === "primary" ? [{ scale: 1.02 }] : undefined,
        };
      }}
    >
      <XStack alignItems="center" gap={s.iconGap}>
        {isLoading ? (
          <ActivityIndicator size="small" color={variant === "primary" ? "#fff" : c.text} />
        ) : (
          <>
            {icon}
            {!isIconOnly && label != null && (
              <Text
                fontSize={s.font}
                fontWeight="500"
                color={
                  disabled
                    ? aiqlickTokens.gray500
                    : variant === "primary"
                      ? "#fff"
                      : c.text
                }
              >
                {label}
              </Text>
            )}
            {iconRight}
          </>
        )}
      </XStack>
    </Pressable>
  );
}
