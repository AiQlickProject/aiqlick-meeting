import { createTamagui } from "tamagui";
import { defaultConfig } from "@tamagui/config/v4";

/**
 * aiqlick design tokens — single source of truth across the meeting
 * client (web + iOS + Android). Values mirror
 * `aiqlick-frontend/app/globals.css` so the two products share the
 * exact same colour language.
 *
 * Convention: kebab-case names match the Tailwind utility names used
 * in the frontend (gray-900, primary, success-500, etc.) so when we
 * port a snippet from the frontend, the colour name carries over.
 */
export const aiqlickTokens = {
  // Brand
  primary: "#3D52A0",
  primaryHover: "#34468a",
  primaryActive: "#2B3C75",
  primaryLight: "#7091E6",
  primaryTint: "#ADBBDA",
  primaryFaint: "#EDE8F5",

  // Text / surfaces
  textDark: "#2C3E50",
  surface: "#ffffff",
  surfaceSubtle: "#f9fafb",
  surfaceMuted: "#f3f4f6",

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
  gray50: "#f9fafb",
  white: "#ffffff",

  // Semantic
  danger: "#dc2626",
  dangerLight: "#fee2e2",
  dangerHover: "#ef4444",
  success: "#16a34a",
  successLight: "#dcfce7",
  warning: "#d97706",
  warningLight: "#fef3c7",
  info: "#0ea5e9",
  infoLight: "#e0f2fe",

  // The signature page gradient (kept here so any screen can hit it
  // without re-stringing the stops).
  gradientStops: [
    "#1A2556",
    "#2A3B7D",
    "#3D52A0",
    "#4B61A8",
    "#5B6FB8",
    "#7091E6",
  ] as string[],

  // Radius scale (mirrors TWSharedStyles in the frontend)
  radiusXs: 2,
  radiusSm: 4,
  radiusMd: 6,
  radiusLg: 8,
  radiusXl: 12,
  radius2xl: 16,
} as const;

/**
 * Tailwind utility -> hex lookup used by ported snippets. Mirrors the
 * subset of Tailwind classes the frontend actually uses on the
 * surfaces we're replicating.
 */
export const twColors = {
  "gray-50": aiqlickTokens.gray50,
  "gray-100": aiqlickTokens.gray100,
  "gray-200": aiqlickTokens.gray200,
  "gray-300": aiqlickTokens.gray300,
  "gray-400": aiqlickTokens.gray400,
  "gray-500": aiqlickTokens.gray500,
  "gray-600": aiqlickTokens.gray600,
  "gray-700": aiqlickTokens.gray700,
  "gray-800": aiqlickTokens.gray800,
  "gray-900": aiqlickTokens.gray900,
  "gray-950": aiqlickTokens.gray950,
  primary: aiqlickTokens.primary,
  "primary-light": aiqlickTokens.primaryLight,
  "primary-tint": aiqlickTokens.primaryTint,
  "primary-faint": aiqlickTokens.primaryFaint,
  danger: aiqlickTokens.danger,
  success: aiqlickTokens.success,
  warning: aiqlickTokens.warning,
  info: aiqlickTokens.info,
};

const config = createTamagui({
  ...defaultConfig,
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      background: aiqlickTokens.white,
      backgroundHover: aiqlickTokens.gray50,
      backgroundPress: aiqlickTokens.gray100,
      color: aiqlickTokens.textDark,
      colorHover: aiqlickTokens.gray900,
      borderColor: aiqlickTokens.gray200,
    },
    dark: {
      ...defaultConfig.themes.dark,
      background: aiqlickTokens.gray950,
      backgroundHover: aiqlickTokens.gray900,
      backgroundPress: aiqlickTokens.gray800,
      color: aiqlickTokens.gray100,
      colorHover: aiqlickTokens.white,
      borderColor: aiqlickTokens.gray800,
    },
  },
});

export type AppConfig = typeof config;

declare module "tamagui" {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
