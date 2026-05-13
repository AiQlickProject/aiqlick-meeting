import { Pressable } from "react-native";
import { Text, XStack } from "tamagui";
import type { ReactNode } from "react";

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
}

/**
 * Primary CTA matching `TWButton variant="primary" size="md"` from
 * aiqlick-frontend: solid `#3D52A0`, 40px tall, white text, subtle
 * lift on hover, scale-down on press. No gradient — frontend uses
 * the flat brand colour.
 */
export default function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  fullWidth = true,
  icon,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed, hovered }) => ({
        height: 40,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        alignSelf: fullWidth ? "stretch" : "flex-start",
        backgroundColor: disabled
          ? "#9aa6c9"
          : pressed
            ? "#34468a"
            : hovered
              ? "#4B61A8"
              : "#3D52A0",
        transform: pressed ? [{ scale: 0.98 }] : hovered ? [{ scale: 1.02 }] : undefined,
        opacity: loading ? 0.8 : 1,
        shadowColor: "#1A2556",
        shadowOpacity: hovered ? 0.25 : 0.1,
        shadowRadius: hovered ? 12 : 6,
        shadowOffset: { width: 0, height: 4 },
      })}
    >
      <XStack alignItems="center" gap={8}>
        {icon}
        <Text color="#fff" fontSize={14} fontWeight="500">
          {loading ? "Please wait…" : label}
        </Text>
      </XStack>
    </Pressable>
  );
}
