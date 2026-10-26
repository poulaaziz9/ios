import Link from "next/link";

import { AttendanceForm } from "@/components/attendance-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveAttendance } from "@/app/s/[serviceId]/servant/actions";
import { cairoNoon, cairoToday, formatDate } from "@/lib/format";
import { signedUrls } from "@/lib/storage";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

const t = strings.attendance;

/**
 * Meeting attendance for one day: pick the date, tick who came, save.
 * Shared by the servant and admin areas (`basePath` is the page's own URL).
 */
export async function AttendanceSheet({
  serviceId,
  date: requested,
  basePath,
  aboveBottomNav,
}: {
  serviceId: string;
  date?: string;
  basePath: string;
  aboveBottomNav?: boolean;
}) {
  const today = cairoToday();
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) && requested <= today ? requested : today;

  const supabase = await createClient();
  const [{ data: sheet }, { data: classes }, { data: recent }] = await Promise.all([
    supabase.rpc("meeting_attendance_sheet", { p_service: serviceId, p_date: date }),
    supabase.from("classes").select("id, name, sort_order").eq("service_id", serviceId).order("sort_order"),
    supabase.rpc("recent_meetings", { p_service: serviceId }),
  ]);

  const classOrder = new Map((classes ?? []).map((c, i) => [c.id, { name: c.name, i }]));
  const sorted = [...(sheet ?? [])].sort(
    (a, b) =>
      (classOrder.get(a.class_id ?? "")?.i ?? 1e9) - (classOrder.get(b.class_id ?? "")?.i ?? 1e9) ||
      a.full_name.localeCompare(b.full_name, "ar"),
  );
  const avatars = await signedUrls("avatars", sorted.map((r) => r.avatar_url));

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">{t.title}</h2>
          <p className="text-sm text-muted-foreground">{t.hint}</p>
        </div>
        <form className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="date">{t.date}</Label>
            <Input id="date" name="date" type="date" defaultValue={date} max={today} required />
          </div>
          <Button type="submit" variant="secondary">
            {t.show}
          </Button>
        </form>
        <p className="text-sm font-medium">{formatDate(cairoNoon(date))}</p>
      </section>

      <AttendanceForm
        key={date}
        aboveBottomNav={aboveBottomNav}
        action={saveAttendance.bind(null, serviceId, date)}
        rows={sorted.map((r) => ({
          id: r.served_id,
          name: r.full_name,
          avatarUrl: r.avatar_url ? avatars.get(r.avatar_url) : null,
          group: classOrder.get(r.class_id ?? "")?.name ?? t.noClass,
          present: r.present,
        }))}
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.recent}</h2>
        {!recent?.length ? (
          <p className="text-sm text-muted-foreground">{t.noRecent}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {recent.map((m) => (
              <li key={m.meeting_date}>
                <Link
                  href={`${basePath}?date=${m.meeting_date}`}
                  className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm hover:bg-accent"
                >
                  <span className={m.meeting_date === date ? "font-semibold" : undefined}>
                    {formatDate(cairoNoon(m.meeting_date))}
                  </span>
                  <span className="text-muted-foreground">{t.attendedCount(m.present_count)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
