import { CheckInButton } from "@/components/check-in-button";
import { Badge } from "@/components/ui/badge";
import { requireUserId } from "@/lib/auth/session";
import { cairoNoon, cairoToday, formatDate } from "@/lib/format";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { checkIn } from "../actions";

const t = strings.servant;

export default async function ServantPrepPage({ params }: PageProps<"/s/[serviceId]/servant/prep">) {
  const { serviceId } = await params;
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("prep_sessions")
    .select("id, title, session_date, prep_attendance(servant_id)")
    .eq("service_id", serviceId)
    .order("session_date", { ascending: false })
    .limit(30);
  const today = cairoToday();

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{t.sessions}</h2>
      {!sessions?.length ? (
        <p className="text-sm text-muted-foreground">{t.noSessions}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => {
            const attended = s.prep_attendance.some((a) => a.servant_id === userId);
            const isToday = s.session_date === today;
            const future = s.session_date > today;
            return (
              <li key={s.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{s.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {isToday ? t.today : formatDate(cairoNoon(s.session_date))}
                    </div>
                  </div>
                  {attended ? (
                    <Badge>{t.attended}</Badge>
                  ) : future ? (
                    <Badge variant="outline">{t.upcoming}</Badge>
                  ) : (
                    !isToday && <Badge variant="secondary">{t.missed}</Badge>
                  )}
                </div>
                {isToday && !attended && <CheckInButton action={checkIn.bind(null, serviceId, s.id)} />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
