// Timezone-correct date helpers. Mirrors the frontend's
// `@utils/dates/timezone` so a meeting scheduled at "10:00 in
// Europe/Stockholm" produces the same UTC instant regardless of the
// device's own timezone.

export function defaultTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Convert a wall-clock `date` (YYYY-MM-DD) + `time` (HH:MM) that the
 * user entered *as if standing in `timeZone`* into the corresponding
 * UTC ISO instant.
 *
 * Algorithm: treat the wall components as if they were UTC, ask
 * Intl what that instant looks like in `timeZone`, and use the
 * difference as the zone offset. Single-pass; DST-boundary inputs
 * (the 1–2h that don't exist / repeat) resolve to a sane adjacent
 * instant rather than throwing.
 */
export function zonedDateTimeToUtcIso(
  date: string,
  time: string,
  timeZone: string,
): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const asUtc = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0);

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = dtf.formatToParts(new Date(asUtc));
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  const tzAsIfUtc = Date.UTC(
    map.year,
    map.month - 1,
    map.day,
    map.hour === 24 ? 0 : map.hour,
    map.minute,
    map.second,
  );
  const offset = tzAsIfUtc - asUtc;
  return new Date(asUtc - offset).toISOString();
}

/** True when `time` is a valid 24-hour `HH:MM` string. */
export function isValidHhMm(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

/** Normalise loose input like `9:5` / `9:00` to `09:05` / `09:00`. */
export function normalizeHhMm(time: string): string {
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(time.trim());
  if (!m) return time.trim();
  const h = Math.min(23, Number(m[1]));
  const min = Math.min(59, Number(m[2]));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
