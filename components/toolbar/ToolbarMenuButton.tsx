import { type ReactNode, useState } from "react";
import { Platform, Pressable } from "react-native";
import { ChevronUp } from "@tamagui/lucide-icons";
import { View, XStack, Text } from "tamagui";

import MenuShell from "./MenuShell";

interface Props {
  tooltip: string;
  highlighted?: boolean;
  active?: boolean;
  icon: ReactNode;
  /** Width of the floating menu panel. */
  menuWidth?: number;
  /** Align the menu's right edge with the button (for right-cluster items). */
  alignRight?: boolean;
  /** Menu content — receives a `close` callback to dismiss after action. */
  children: (close: () => void) => ReactNode;
}

/**
 * Toolbar button that opens a floating menu above itself. The trigger
 * mirrors `ToolbarButton`'s look so the bar stays visually consistent.
 */
export default function ToolbarMenuButton({
  tooltip,
  highlighted,
  active,
  icon,
  menuWidth,
  alignRight,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const baseBg = active
    ? "rgba(239, 68, 68, 0.9)"
    : open || highlighted
      ? "rgba(61, 82, 160, 0.25)"
      : "transparent";

  return (
    <View position="relative">
      {hovered && !open && Platform.OS === "web" && tooltip ? (
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
            {tooltip}
          </Text>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tooltip}
        onPress={() => setOpen((v) => !v)}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={({ pressed }) => ({
          height: 40,
          paddingHorizontal: 8,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 2,
          backgroundColor: pressed ? "rgba(61, 82, 160, 0.35)" : baseBg,
          transform: pressed ? [{ scale: 0.96 }] : undefined,
        })}
      >
        <XStack alignItems="center" gap={2}>
          {icon}
          <ChevronUp size={12} color="#9ca3af" />
        </XStack>
      </Pressable>
      <MenuShell open={open} onClose={() => setOpen(false)} width={menuWidth} alignRight={alignRight}>
        {children(() => setOpen(false))}
      </MenuShell>
    </View>
  );
}
