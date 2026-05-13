/**
 * Cross-platform URL helpers. On web we read from `window.location`;
 * on native, Expo Router gives us the params via `useLocalSearchParams`
 * so this file only handles humanizing and decoding.
 */

export function humanizeRoomName(slug: string): string {
  if (!slug) return "";
  // aiqlick room slugs encode identity as trailing hex/UUID/timestamp
  // segments — e.g. `aiqlick-interview-1fc22633-5c447d5a-1766859616903`.
  // Strip those so the header reads "Aiqlick Interview" instead of
  // the raw machine slug.
  const isMachineToken = (t: string) =>
    /^[0-9a-f]{6,}$/i.test(t) || /^\d{6,}$/.test(t);
  const tokens = slug.replace(/[-_]+/g, " ").trim().split(/\s+/);
  while (tokens.length > 1 && isMachineToken(tokens[tokens.length - 1])) {
    tokens.pop();
  }
  return tokens
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

interface JwtPayload {
  context?: {
    subject?: string;
    user?: { name?: string; moderator?: boolean };
  };
  moderator?: boolean;
}

/**
 * Lightweight JWT decode (no signature check — we're just reading
 * metadata; signature is enforced by Prosody on the conference side).
 */
function decodeJwt(jwt: string | null | undefined): JwtPayload | null {
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
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * If aiqlick-backend includes the meeting title in the JWT's
 * `context.subject`, we'd rather use that than the humanized room
 * slug.
 */
export function decodeJwtSubject(jwt: string | null | undefined): string | null {
  return decodeJwt(jwt)?.context?.subject?.trim() || null;
}

/**
 * Top-level `moderator` claim or nested `context.user.moderator` —
 * either marks the JWT bearer as the host. Used to choose the right
 * connecting-state copy ("Waiting for host" vs "Connecting").
 */
export function decodeJwtIsModerator(jwt: string | null | undefined): boolean {
  const data = decodeJwt(jwt);
  return Boolean(data?.moderator || data?.context?.user?.moderator);
}

export function decodeJwtDisplayName(jwt: string | null | undefined): string | null {
  return decodeJwt(jwt)?.context?.user?.name?.trim() || null;
}
