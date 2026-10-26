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

/** "yyyy-mm-ddThh:mm" in Cairo (for <input type="datetime-local">). */
export function toCairoDateTimeInput(value: string | Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(value))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

const dateTimeFmt = new Intl.DateTimeFormat("ar-EG", {
  timeZone: "Africa/Cairo",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDateTime(value: string | Date) {
  return dateTimeFmt.format(new Date(value));
}

/** True if the timestamp is set and already passed. */
export function isPast(value: string | null | undefined) {
  return !!value && new Date(value).getTime() <= Date.now();
}

const weekdayFmt = new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", weekday: "long" });
const dayFmt = new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", day: "numeric" });
const monthFmt = new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", month: "short" });

/** Parts of a yyyy-mm-dd day for a calendar-style badge: "الجمعة", "٣٠", "أكتوبر". */
export function dayParts(day: string) {
  const d = new Date(cairoNoon(day));
  return { weekday: weekdayFmt.format(d), day: dayFmt.format(d), month: monthFmt.format(d) };
}

/** A wall-clock time ("18:30" or "18:30:00") as "٦:٣٠ م". */
export function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return new Intl.DateTimeFormat("ar-EG", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, 0, 1, h, m)),
  );
}
