import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { X } from "@tamagui/lucide-icons";
import { Circle, Text, View, XStack } from "tamagui";

import { aiqlickTokens } from "@/tamagui.config";

export type TWChipColor =
  | "primary"
  | "danger"
  | "success"
  | "warning"
  | "secondary"
  | "default";
export type TWChipVariant = "solid" | "flat" | "bordered" | "dot" | "light";
export type TWChipSize = "sm" | "md" | "lg";

interface Props {
  label: string;
  color?: TWChipColor;
  variant?: TWChipVariant;
  size?: TWChipSize;
  avatar?: ReactNode;
  onClose?: () => void;
}

const PALETTE: Record<TWChipColor, { base: string; text: string; tint: string }> = {
  primary: { base: aiqlickTokens.primary, text: "#fff", tint: "rgba(61, 82, 160, 0.14)" },
  danger: { base: aiqlickTokens.danger, text: "#fff", tint: "rgba(220, 38, 38, 0.14)" },
  success: { base: aiqlickTokens.success, text: "#fff", tint: "rgba(22, 163, 74, 0.16)" },
  warning: { base: aiqlickTokens.warning, text: "#fff", tint: "rgba(217, 119, 6, 0.16)" },
  secondary: { base: aiqlickTokens.gray700, text: "#fff", tint: aiqlickTokens.gray100 },
  default: { base: aiqlickTokens.gray400, text: aiqlickTokens.gray800, tint: aiqlickTokens.gray100 },
};

const SIZE_SPEC: Record<TWChipSize, { height: number; px: number; font: number; gap: number }> = {
  sm: { height: 20, px: 8, font: 10, gap: 4 },
  md: { height: 24, px: 10, font: 11, gap: 6 },
  lg: { height: 28, px: 12, font: 12, gap: 6 },
};

export function TWChip({
  label,
  color = "default",
  variant = "flat",
  size = "sm",
  avatar,
  onClose,
}: Props) {
  const p = PALETTE[color];
  const s = SIZE_SPEC[size];

  const styling = (() => {
    if (variant === "solid")
      return { bg: p.base, fg: p.text, border: "transparent" as const };
    if (variant === "flat" || variant === "light")
      return { bg: p.tint, fg: color === "default" ? p.text : p.base, border: "transparent" as const };
    if (variant === "bordered")
      return { bg: "transparent", fg: p.base, border: p.base };
    // dot
    return { bg: "transparent", fg: p.base, border: "transparent" as const };
  })();

  return (
    <XStack
      height={s.height}
      paddingHorizontal={s.px}
      alignItems="center"
      gap={s.gap}
      borderRadius={9999}
      backgroundColor={styling.bg}
      borderWidth={variant === "bordered" ? 1 : 0}
      borderColor={styling.border}
    >
      {variant === "dot" && <Circle size={6} backgroundColor={p.base} />}
      {avatar}
      <Text
        color={styling.fg}
        fontSize={s.font}
        fontWeight="600"
        letterSpacing={0.3}
      >
        {label}
      </Text>
      {onClose && (
        <Pressable
          onPress={onClose}
          hitSlop={4}
          style={({ pressed, hovered }) => ({
            opacity: pressed ? 0.6 : hovered ? 0.8 : 1,
          })}
        >
          <View
            width={14}
            height={14}
            borderRadius={9999}
            alignItems="center"
            justifyContent="center"
            backgroundColor="rgba(0,0,0,0.1)"
          >
            <X size={9} color={styling.fg as string} />
          </View>
        </Pressable>
      )}
    </XStack>
  );
}

/**
 * Lightweight badge variant. Same colour palette, no close button,
 * shorter padding. Mirrors `<TWBadge label="..." />` from the frontend.
 */
export function TWBadge({
  label,
  color = "default",
  variant = "flat",
}: {
  label: string;
  color?: TWChipColor;
  variant?: "flat" | "solid";
}) {
  return <TWChip label={label} color={color} variant={variant} size="sm" />;
}
