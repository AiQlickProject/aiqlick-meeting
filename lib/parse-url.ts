/**
 * Cross-platform URL helpers. On web we read from `window.location`;
 * on native, Expo Router gives us the params via `useLocalSearchParams`
 * so this file only handles humanizing and decoding.
 */

export function humanizeRoomName(slug: string): string {
  if (!slug) return "";
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * If aiqlick-backend includes the meeting title in the JWT's
 * `context.subject`, we'd rather use that than the humanized room
 * slug. Lightweight JWT decode (no signature check — we're just
 * reading metadata; signature is enforced by Prosody on the
 * conference side).
 */
export function decodeJwtSubject(jwt: string | null | undefined): string | null {
  if (!jwt) return null;
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8");
    const data = JSON.parse(json) as { context?: { subject?: string } };
    return data.context?.subject?.trim() || null;
  } catch {
    return null;
  }
}
