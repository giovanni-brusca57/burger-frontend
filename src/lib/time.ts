/**
 * Timezone helpers — separate "business time" (UTC, fixed) from "display time"
 * (viewer's local). MAC business logic is anchored in UTC; UI adapts to the viewer.
 *
 * Note: BE schedules cron at 09:00 / 15:00 / 21:00 WIB (UTC+7) which corresponds
 * to 02:00 / 08:00 / 14:00 UTC. We display in UTC for clarity across markets.
 */
import { useEffect, useState } from 'react';

export const UTC_TZ = 'UTC';

// ── Formatting ───────────────────────────────────────────────────────────────

/** Format an instant in UTC. */
export function formatUtc(
  iso: string | Date,
  opts?: Intl.DateTimeFormatOptions
): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleString(undefined, { ...opts, timeZone: UTC_TZ });
}

/** Format an instant in viewer's local timezone. */
export function formatLocal(
  iso: string | Date,
  opts?: Intl.DateTimeFormatOptions
): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleString(undefined, opts);
}

/** Viewer's resolved IANA timezone identifier (e.g. "America/Los_Angeles"). */
export function getUserTzId(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Short timezone abbreviation for the viewer (e.g. "PDT", "SGT", "WIB"). */
export function getUserTzAbbr(): string {
  const parts = new Intl.DateTimeFormat(undefined, {
    timeZoneName: 'short',
  }).formatToParts(new Date());
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? 'Local';
}

/**
 * True if the viewer's resolved zone is effectively UTC — meaning we can skip
 * the dual "local + UTC" display because they'd be identical. Covers `UTC`,
 * `Etc/UTC`, `Etc/GMT`, and other zero-offset aliases via runtime offset check.
 */
export function isUserInUtc(): boolean {
  const tz = getUserTzId();
  if (tz === 'UTC' || tz === 'Etc/UTC' || tz === 'Etc/GMT') return true;
  // Fallback: treat any zone whose current offset is 0 as effectively UTC.
  return new Date().getTimezoneOffset() === 0;
}

// ── Dual-time labels ─────────────────────────────────────────────────────────

/**
 * Returns:
 *  - "13:13 UTC"                                  — when viewer IS effectively in UTC
 *  - "13:13 UTC (your time: 02:13 PDT)"           — when viewer is elsewhere
 */
export function dualTimeLabel(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const utcStr = d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: UTC_TZ,
  });
  if (isUserInUtc()) return `${utcStr} UTC`;
  const localStr = d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${utcStr} UTC (${localStr} ${getUserTzAbbr()})`;
}

/** Date-only dual label, e.g. "30 Apr UTC" or "30 Apr UTC (29 Apr local)" */
export function dualDateLabel(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const utcDate = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: UTC_TZ,
  });
  if (isUserInUtc()) return utcDate;
  const localDate = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
  if (utcDate === localDate) return utcDate;
  return `${utcDate} (${localDate} ${getUserTzAbbr()})`;
}

/** Local time only — for dashboard cards where viewer wants their own time. */
export function localTimeShort(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** UTC time only — for cards where the canonical batch label matters. */
export function utcTimeShort(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: UTC_TZ,
  });
}

/** Local date short, e.g. "30 Apr" */
export function localDateShort(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// ── Lock window deadlines ────────────────────────────────────────────────────

/**
 * Compute the next 02:00 UTC instant as a Date. (02:00 UTC == 09:00 WIB,
 * the BE batch-1 lock time — same physical moment, displayed in UTC.)
 *
 * If current UTC hour < 2 → today 02:00 UTC.
 * Otherwise → tomorrow 02:00 UTC.
 */
export function getNextUtcLockDeadline(now: Date = new Date()): Date {
  const utcDateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD in UTC
  const utcHour = now.getUTCHours();

  if (utcHour < 2) {
    return new Date(`${utcDateStr}T02:00:00Z`);
  }
  // Tomorrow 02:00 UTC
  const [y, m, d] = utcDateStr.split('-').map((s) => parseInt(s, 10));
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1));
  const ty = tomorrow.getUTCFullYear();
  const tm = String(tomorrow.getUTCMonth() + 1).padStart(2, '0');
  const td = String(tomorrow.getUTCDate()).padStart(2, '0');
  return new Date(`${ty}-${tm}-${td}T02:00:00Z`);
}

/** Format a duration (ms) as "Xh Ym" or "Xm Ys" or "Xs" / "—" if past. */
export function formatDuration(ms: number): string {
  if (ms <= 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  const totalMin = Math.floor(totalSec / 60);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  const seconds = totalSec % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// ── Hook: live countdown to a deadline ───────────────────────────────────────

/** Returns the formatted remaining time, refreshing every second. */
export function useCountdown(deadline: Date | null): string {
  // Track "now" instead of the formatted label so we don't setState synchronously
  // inside the effect body — derive the label during render instead.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline]);
  if (!deadline) return '';
  return formatDuration(deadline.getTime() - now);
}
