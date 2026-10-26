// Dates are shown in Cairo time with Arabic (Egypt) formatting.

const dateFmt = new Intl.DateTimeFormat("ar-EG", {
  timeZone: "Africa/Cairo",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const relFmt = new Intl.RelativeTimeFormat("ar-EG", { numeric: "auto" });

export function formatDate(value: string | Date) {
  return dateFmt.format(new Date(value));
}

/** "امبارح", "من ٣ أيام"… for recent dates; falls back to a full date. */
export function formatRelative(value: string | Date, now = new Date()) {
  const days = Math.round((new Date(value).getTime() - now.getTime()) / 86_400_000);
  return Math.abs(days) < 30 ? relFmt.format(days, "day") : formatDate(value);
}

/** yyyy-mm-dd of a timestamp in Cairo (for <input type="date">). */
export function toCairoDateInput(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date(value));
}

/**
 * Expiry timestamps are stored as the end of the chosen day (next midnight in
 * Cairo); step back a second to get the day the admin picked.
 */
export function expiryDay(expiresAt: string) {
  return new Date(new Date(expiresAt).getTime() - 1000);
}

/** Today's date (yyyy-mm-dd) in Cairo. */
export function cairoToday() {
  return toCairoDateInput(new Date());
}

/** A yyyy-mm-dd day as a timestamp at noon Cairo time (safe for display/storage). */
export function cairoNoon(day: string) {
  return `${day}T12:00:00+02:00`;
}

/** True if never, or more than `days` days ago. */
export function isOlderThan(value: string | null | undefined, days: number) {
  return !value || Date.now() - new Date(value).getTime() > days * 86_400_000;
}
