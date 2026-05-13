import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { View, Text } from "tamagui";

interface Props {
  tooltip: string;
  active?: boolean;
  danger?: boolean;
  highlighted?: boolean;
  badge?: number;
  onPress: () => void;
  children: ReactNode;
}

/**
 * Single toolbar affordance. Variants mirror MeetingToolbar in
 * aiqlick-frontend:
 *
 *   default     transparent     text gray-200
 *   highlighted bg-primary/20   text primary-light + ring
 *   active      bg-red-500/90   text white
 *   danger      bg-red-600      text white
 */
export default function ToolbarButton({
  tooltip,
  active,
  danger,
  highlighted,
  badge,
  onPress,
  children,
}: Props) {
  const backgroundColor = danger
    ? "#dc2626"
    : active
      ? "rgba(239, 68, 68, 0.9)"
      : highlighted
        ? "rgba(61, 82, 160, 0.25)"
        : "transparent";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tooltip}
      onPress={onPress}
      style={({ pressed, hovered }) => ({
        width: 40,
        height: 40,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        backgroundColor:
          pressed || hovered
            ? hoverColor(backgroundColor, !!danger, !!active, !!highlighted)
            : backgroundColor,
        transform: pressed ? [{ scale: 0.95 }] : undefined,
      })}
    >
      <View
        opacity={1}
        position="relative"
      >
        {children}
      </View>
      {badge != null && badge > 0 && (
        <View
          position="absolute"
          top={-4}
          right={-4}
          minWidth={16}
          height={16}
          borderRadius={9999}
          backgroundColor="#3D52A0"
          alignItems="center"
          justifyContent="center"
          paddingHorizontal={4}
        >
          <Text color="#fff" fontSize={10} fontWeight="700">
            {badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function hoverColor(base: string, danger: boolean, active: boolean, highlighted: boolean) {
  if (danger) return "#ef4444";
  if (active) return "rgba(248, 113, 113, 0.9)";
  if (highlighted) return "rgba(61, 82, 160, 0.35)";
  if (base === "transparent") return "rgba(255, 255, 255, 0.08)";
  return base;
}
