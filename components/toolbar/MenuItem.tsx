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
 *
 * Layout reason: the row body (icon + label + description) is its own
 * Pressable, with `rightSlot` rendered as a SIBLING — not a child. If
 * we wrapped the whole row in a single Pressable, an interactive
 * rightSlot (e.g. <Switch>) would fire its own change handler AND
 * bubble the click up to the outer Pressable, causing the row's
 * onPress to fire a second time. With "toggle blur" / "noise
 * suppression" that double-fire flipped the state back and made the
 * toggles appear broken from the user's POV. Separating the panes
 * fixes it; rightSlot now lives in its own non-bubbling cell.
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
    <XStack
      alignItems="center"
      gap={10}
      paddingHorizontal={10}
      paddingVertical={4}
      opacity={disabled ? 0.4 : 1}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled, selected: !!selected }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed, hovered }) => ({
          flex: 1,
          borderRadius: 8,
          paddingHorizontal: 6,
          paddingVertical: 6,
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
          {selected && !hideCheckmark ? <Check size={14} color="#7091E6" /> : null}
        </XStack>
      </Pressable>
      {rightSlot ? (
        <View paddingRight={2}>{rightSlot}</View>
      ) : null}
    </XStack>
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
