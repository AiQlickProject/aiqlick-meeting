import { createTamagui } from "tamagui";
import { defaultConfig } from "@tamagui/config/v4";

/**
 * aiqlick design tokens — mirrors aiqlick-frontend/app/globals.css so
 * the meeting client and the rest of the product share the same
 * visual language across web + native.
 */
export const aiqlickTokens = {
  // Brand
  primary: "#3D52A0",
  primaryLight: "#7091E6",
  primaryFaint: "#ADBBDA",
  primarySoft: "#EDE8F5",

  // Neutrals (tailwind gray-* equivalents)
  gray950: "#030712",
  gray900: "#111827",
  gray800: "#1f2937",
  gray700: "#374151",
  gray600: "#4b5563",
  gray500: "#6b7280",
  gray400: "#9ca3af",
  gray300: "#d1d5db",
  gray200: "#e5e7eb",
  gray100: "#f3f4f6",
  white: "#ffffff",

  // Status
  red600: "#dc2626",
  red500: "#ef4444",
  red400: "#f87171",
  green500: "#22c55e",
  amber500: "#f59e0b",
} as const;

const config = createTamagui({
  ...defaultConfig,
  themes: {
    ...defaultConfig.themes,
    dark: {
      ...defaultConfig.themes.dark,
      background: aiqlickTokens.gray950,
      backgroundHover: aiqlickTokens.gray900,
      backgroundPress: aiqlickTokens.gray800,
      color: aiqlickTokens.gray100,
      colorHover: aiqlickTokens.white,
      borderColor: aiqlickTokens.gray800,
      primary: aiqlickTokens.primary,
    },
  },
});

export type AppConfig = typeof config;

declare module "tamagui" {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
