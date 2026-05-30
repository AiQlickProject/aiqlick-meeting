import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { Check } from "@tamagui/lucide-icons";
import { View, XStack, YStack, Text } from "tamagui";

interface Props {
  icon?: ReactNode;
  label: string;
  description?: string;
  rightSlot?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  /** Suppress the auto-rendered checkmark when `selected` is true. */
  hideCheckmark?: boolean;
  onPress?: () => void;
}

/**
 * Single row in a toolbar menu (Reactions, View, More, Devices, …).
 * Visually unified across all menus so the meeting chrome reads as one
 * surface even as we add features.
 */
export default function MenuItem({
  icon,
  label,
  description,
  rightSlot,
  selected,
  disabled,
  hideCheckmark,
  onPress,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, hovered }) => ({
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        opacity: disabled ? 0.4 : 1,
        backgroundColor: disabled
          ? "transparent"
          : pressed
            ? "rgba(112, 145, 230, 0.22)"
            : hovered
              ? "rgba(255,255,255,0.06)"
              : "transparent",
      })}
    >
      <XStack alignItems="center" gap={10}>
        {icon ? (
          <View width={20} alignItems="center" justifyContent="center">
            {icon}
          </View>
        ) : null}
        <YStack flex={1} gap={1}>
          <Text color="#fff" fontSize={13} fontWeight="500" numberOfLines={1}>
            {label}
          </Text>
          {description ? (
            <Text color="rgba(255,255,255,0.55)" fontSize={11} numberOfLines={2}>
              {description}
            </Text>
          ) : null}
        </YStack>
        {rightSlot}
        {selected && !hideCheckmark ? <Check size={14} color="#7091E6" /> : null}
      </XStack>
    </Pressable>
  );
}

export function MenuSeparator() {
  return (
    <View height={1} marginVertical={4} backgroundColor="rgba(255,255,255,0.06)" />
  );
}

export function MenuSectionLabel({ children }: { children: string }) {
  return (
    <Text
      color="rgba(255,255,255,0.45)"
      fontSize={10}
      fontWeight="700"
      letterSpacing={1}
      paddingHorizontal={10}
      paddingTop={6}
      paddingBottom={4}
    >
      {children.toUpperCase()}
    </Text>
  );
}
