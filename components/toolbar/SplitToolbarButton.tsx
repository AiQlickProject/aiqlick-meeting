import { type ReactNode, useState } from "react";
import { Platform, Pressable } from "react-native";
import { ChevronUp } from "@tamagui/lucide-icons";
import { View, Text } from "tamagui";

import MenuShell from "./MenuShell";

interface Props {
  tooltip: string;
  caretTooltip: string;
  active?: boolean;
  highlighted?: boolean;
  icon: ReactNode;
  onPress: () => void;
  menuWidth?: number;
  children: (close: () => void) => ReactNode;
}

/**
 * Teams-style split button — left half toggles the underlying state
 * (mute / video), the right half (caret) opens a popover for device
 * selection. Visually the two halves share one rounded pill divided by
 * a faint hairline so it still reads as a single control.
 */
export default function SplitToolbarButton({
  tooltip,
  caretTooltip,
  active,
  highlighted,
  icon,
  onPress,
  menuWidth = 280,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [hoverHalf, setHoverHalf] = useState<"main" | "caret" | null>(null);

  const baseBg = active
    ? "rgba(239, 68, 68, 0.9)"
    : highlighted
      ? "rgba(61, 82, 160, 0.25)"
      : "transparent";
  const hoverBg = active
    ? "rgba(248, 113, 113, 0.9)"
    : "rgba(255,255,255,0.08)";

  const tooltipText =
    hoverHalf === "main" ? tooltip : hoverHalf === "caret" ? caretTooltip : null;

  return (
    <View position="relative">
      {tooltipText && Platform.OS === "web" ? (
        <View
          position="absolute"
          bottom={48}
          left="50%"
          transform={[{ translateX: -50 }] as never}
          paddingHorizontal={10}
          paddingVertical={5}
          borderRadius={6}
          backgroundColor="rgba(15, 23, 42, 0.96)"
          borderWidth={1}
          borderColor="rgba(255,255,255,0.08)"
          minWidth={100}
          alignItems="center"
          pointerEvents="none"
          zIndex={500}
        >
          <Text color="#fff" fontSize={11} fontWeight="500" numberOfLines={1}>
            {tooltipText}
          </Text>
        </View>
      ) : null}

      <View
        flexDirection="row"
        alignItems="center"
        borderRadius={8}
        overflow="hidden"
        backgroundColor={baseBg}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tooltip}
          onPress={onPress}
          onHoverIn={() => setHoverHalf("main")}
          onHoverOut={() => setHoverHalf(null)}
          style={({ pressed, hovered }) => ({
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed || hovered ? hoverBg : "transparent",
            transform: pressed ? [{ scale: 0.95 }] : undefined,
          })}
        >
          {icon}
        </Pressable>
        <View width={1} height={24} backgroundColor="rgba(255,255,255,0.12)" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={caretTooltip}
          onPress={() => setOpen((v) => !v)}
          onHoverIn={() => setHoverHalf("caret")}
          onHoverOut={() => setHoverHalf(null)}
          style={({ pressed, hovered }) => ({
            width: 22,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
              pressed || hovered || open ? "rgba(255,255,255,0.08)" : "transparent",
          })}
        >
          <ChevronUp size={12} color="#9ca3af" />
        </Pressable>
      </View>

      <MenuShell open={open} onClose={() => setOpen(false)} width={menuWidth}>
        {children(() => setOpen(false))}
      </MenuShell>
    </View>
  );
}
