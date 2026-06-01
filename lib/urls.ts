import Constants from "expo-constants";

/**
 * URL helpers for deep-linking out of the meeting client into the
 * main aiqlick web app (credits page, subscription management, etc).
 *
 * The meeting client only has `EXPO_PUBLIC_API_URL` configured —
 * not a dedicated `EXPO_PUBLIC_APP_URL`. We derive the main-app
 * origin from the API origin by swapping `api` → `app` in the
 * hostname, which matches the deployment convention
 * (`api.aiqlick.com` ↔ `app.aiqlick.com`,
 *  `api-dev.aiqlick.com` ↔ `app-dev.aiqlick.com`).
 *
 * Localhost gets special treatment: the meeting backend runs on
 * `:4001` and the frontend dev server on `:4000` (per the frontend
 * CLAUDE.md). Swap the port accordingly.
 */

function readApiUrl(): string | null {
  const fromConstants = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  return fromConstants ?? process.env.EXPO_PUBLIC_API_URL ?? null;
}

/**
 * Resolve the base URL of the main aiqlick web app. Returns null
 * when no API URL is configured (in which case deep-link buttons
 * should be hidden or disabled gracefully).
 */
export function getAppBaseUrl(): string | null {
  const explicit = process.env.EXPO_PUBLIC_APP_URL;
  if (explicit) return stripTrailingSlash(explicit);

  const apiUrl = readApiUrl();
  if (!apiUrl) return null;

  try {
    const url = new URL(apiUrl);
    // hostname swap: api -> app at the start of the hostname
    if (url.hostname.startsWith("api.")) {
      url.hostname = "app." + url.hostname.slice(4);
    } else if (url.hostname.startsWith("api-")) {
      url.hostname = "app-" + url.hostname.slice(4);
    } else if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      // Local dev convention — backend 4001, frontend 4000.
      if (url.port === "4001") url.port = "4000";
    }
    // Drop trailing /graphql in case the env var includes it.
    url.pathname = url.pathname.replace(/\/graphql\/?$/, "");
    return stripTrailingSlash(url.toString());
  } catch {
    return null;
  }
}

function stripTrailingSlash(s: string): string {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

/**
 * Deep link to the main app's credits page. Opening this in a new
 * tab is the recommended pattern — the user keeps the meeting page
 * open as their return target.
 */
export function getCreditsPageUrl(): string | null {
  const base = getAppBaseUrl();
  return base ? `${base}/userprofile/credits` : null;
}

/**
 * Deep link to the subscription / billing settings on the main app.
 * Used for the SUBSCRIPTION_INACTIVE recovery CTA.
 */
export function getBillingPageUrl(): string | null {
  const base = getAppBaseUrl();
  return base ? `${base}/userprofile/payment` : null;
}
