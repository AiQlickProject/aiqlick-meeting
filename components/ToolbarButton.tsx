import { useState, type ReactNode } from "react";
import { Platform, Pressable } from "react-native";
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
 *
 * `tooltip` doubles as the accessibility label *and* a visible
 * floating chip that appears above the button on hover (web only —
 * native devices have no hover concept). Position is absolute so it
 * doesn't push neighbouring buttons.
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
  const [hovered, setHovered] = useState(false);

  const backgroundColor = danger
    ? "#dc2626"
    : active
      ? "rgba(239, 68, 68, 0.9)"
      : highlighted
        ? "rgba(61, 82, 160, 0.25)"
        : "transparent";

  return (
    <View position="relative">
      {hovered && Platform.OS === "web" && tooltip ? (
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
          zIndex={1000}
        >
          <Text color="#fff" fontSize={11} fontWeight="500" numberOfLines={1}>
            {tooltip}
          </Text>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tooltip}
        onPress={onPress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPressIn={() => setHovered(false)}
        style={({ pressed, hovered: pressedHovered }) => ({
          width: 40,
          height: 40,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          backgroundColor:
            pressed || pressedHovered
              ? hoverColor(backgroundColor, !!danger, !!active, !!highlighted)
              : backgroundColor,
          transform: pressed ? [{ scale: 0.95 }] : undefined,
        })}
      >
        <View opacity={1} position="relative">
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
    </View>
  );
}

function hoverColor(base: string, danger: boolean, active: boolean, highlighted: boolean) {
  if (danger) return "#ef4444";
  if (active) return "rgba(248, 113, 113, 0.9)";
  if (highlighted) return "rgba(61, 82, 160, 0.35)";
  if (base === "transparent") return "rgba(255, 255, 255, 0.08)";
  return base;
}
