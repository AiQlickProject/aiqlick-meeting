// AIQLick meeting branding, injected into the embedded Jitsi client via the
// iframe API's interfaceConfigOverwrite.
//
// Why this exists: the in-meeting UI is served by the Jitsi `web` container at
// meet.aiqlick.com. Historically the brand identity (app name, provider name,
// background colour, watermark link) lived in a customised Jitsi source fork
// (`jitsi-fork-archive`). Supplying the same values here makes the branding
// app-driven instead of image-baked, so it renders identically whether
// meet.aiqlick.com runs the fork OR stock upstream `jitsi/web`.
//
// IMPORTANT: every value below is overridable via the external API and cannot
// fail to load (plain strings + a CSS colour — no remote fetch, no 404 risk).
// The logo (DEFAULT_LOGO_URL) is intentionally NOT overridden: it is served
// relative to meet.aiqlick.com and a guessed absolute URL is the only thing
// that could visually break, so it is left to the server.
//
// The values mirror the original `jitsi-fork-archive` interface_config.js
// exactly, so this is behaviour-preserving on the current deployment.
export const JITSI_BRANDING = {
  APP_NAME: "Aiqlick Meeting",
  NATIVE_APP_NAME: "Aiqlick Meeting",
  PROVIDER_NAME: "Aiqlick",
  // Brand background behind the conference (tamagui `primaryFaint`).
  DEFAULT_BACKGROUND: "#EDE8F5",
  JITSI_WATERMARK_LINK: "https://aiqlick.com",
} as const;
