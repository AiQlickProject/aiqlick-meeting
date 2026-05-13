import { Image } from "react-native";
import { Circle, Text } from "tamagui";

import { aiqlickTokens } from "@/tamagui.config";

interface Props {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  color?: string;
}

const PX: Record<NonNullable<Props["size"]>, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
};

const FONT: Record<NonNullable<Props["size"]>, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 18,
};

export function TWAvatar({ src, name, size = "sm", color = aiqlickTokens.primary }: Props) {
  const px = PX[size];
  const font = FONT[size];
  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={{ width: px, height: px, borderRadius: px / 2 }}
        accessibilityLabel={name ?? "avatar"}
      />
    );
  }
  const initials = (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <Circle size={px} backgroundColor={color}>
      <Text color="#fff" fontSize={font} fontWeight="700">
        {initials || "?"}
      </Text>
    </Circle>
  );
}
