/**
 * Parses the meeting room name and JWT from the current page URL.
 *
 * URL shape we support (matches what aiqlick-backend mints via
 * `getMyMeetingLink` and what the legacy Jitsi fork accepted):
 *
 *   https://<host>/<roomName>?jwt=<token>
 *
 * The room name is everything between the leading slash and the
 * first `?`. JWT is the `jwt` query parameter. Both may be empty —
 * callers should validate before instantiating the iframe.
 */
export interface ParsedMeetingUrl {
  roomName: string;
  jwt: string | null;
  /** Display-name hint, if the JWT decodes to a `context.user.name`. */
  displayName: string | null;
  /** Optional subject hint, mirroring the JWT `context.subject` field. */
  subject: string | null;
}

export function parseMeetingUrl(href: string = window.location.href): ParsedMeetingUrl {
  const url = new URL(href);
  const roomName = decodeURIComponent(url.pathname.replace(/^\/+/, "").split("/")[0] ?? "");
  const jwt = url.searchParams.get("jwt");

  let displayName: string | null = null;
  let subject: string | null = null;

  if (jwt) {
    const claims = decodeJwtClaims(jwt);
    displayName = claims?.context?.user?.name ?? null;
    subject = claims?.context?.subject ?? null;
  }

  return { roomName, jwt, displayName, subject };
}

interface JwtClaims {
  context?: {
    user?: { name?: string; email?: string; moderator?: boolean };
    subject?: string;
  };
  room?: string;
  exp?: number;
  nbf?: number;
}

/**
 * Decodes the payload segment of a JWT without verifying its
 * signature. Used only to read non-sensitive hints (display name,
 * subject) for UI purposes — every authorization decision is made
 * server-side by Prosody, which DOES verify the signature.
 */
export function decodeJwtClaims(token: string): JwtClaims | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}
