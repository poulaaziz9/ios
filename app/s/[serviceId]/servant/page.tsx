import Link from "next/link";

import { CheckInButton } from "@/components/check-in-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUserId } from "@/lib/auth/session";
import { cairoNoon, cairoToday, formatDate, isOlderThan } from "@/lib/format";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { checkIn } from "./actions";

const t = strings.servant;
const OVERDUE_DAYS = 14;
const isOverdue = (lastVisit: string | null) => isOlderThan(lastVisit, OVERDUE_DAYS);

export default async function ServantHomePage({ params }: PageProps<"/s/[serviceId]/servant">) {
  const { serviceId } = await params;
  const userId = await requireUserId();
  const supabase = await createClient();

  const today = cairoToday();
  const [{ data: points }, { count: servantsCount }, { data: assigned }, { data: sessions }] =
    await Promise.all([
      supabase.rpc("my_points", { p_service: serviceId }),
      supabase
        .from("service_members")
        .select("id", { count: "exact", head: true })
        .eq("service_id", serviceId)
        .eq("role", "servant")
        .eq("status", "active"),
      supabase.rpc("my_assigned", { p_service: serviceId }),
      supabase
        .from("prep_sessions")
        .select("id, title, session_date, prep_attendance(servant_id)")
        .eq("service_id", serviceId)
        .gte("session_date", today)
        .order("session_date")
        .limit(1),
    ]);

  const mine = points?.find((p) => p.role === "servant");
  const { data: myClass } = mine?.class_id
    ? await supabase.from("classes").select("name").eq("id", mine.class_id).maybeSingle()
    : { data: null };
  const next = sessions?.[0];
  const checkedIn = next?.prep_attendance.some((a) => a.servant_id === userId);
  const overdue = (assigned ?? []).filter((a) => isOverdue(a.last_visit_at)).length;

  return (
    <>
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm opacity-80">{t.myPoints}</div>
            <div className="text-5xl font-bold">{(mine?.service_total ?? 0).toLocaleString("ar-EG")}</div>
            {mine?.service_rank && (
              <div className="mt-1 text-sm opacity-90">
                {t.rankAmongServants(mine.service_rank, servantsCount ?? 0)}
              </div>
            )}
          </div>
          {myClass && (
            <div className="text-end text-sm">
              <div className="opacity-80">{t.myClass}</div>
              <div className="font-semibold">{myClass.name}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Link href={`/s/${serviceId}/servant/served`} className="rounded-xl border bg-card p-4 shadow-sm hover:bg-accent">
        <div className="font-semibold">{t.tabs.served}</div>
        <div className="text-sm text-muted-foreground">
          {assigned?.length ? t.assignedCount(assigned.length) : t.noAssigned}
          {overdue > 0 && <span className="text-destructive"> · {t.needVisit(overdue)}</span>}
        </div>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{t.nextPrep}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!next ? (
            <p className="text-sm text-muted-foreground">{t.noUpcomingPrep}</p>
          ) : (
            <>
              <div>
                <div className="font-medium">{next.title}</div>
                <div className="text-sm text-muted-foreground">
                  {next.session_date === today ? t.today : formatDate(cairoNoon(next.session_date))}
                </div>
              </div>
              {next.session_date === today &&
                (checkedIn ? (
                  <p className="font-medium text-emerald-600">{t.checkedIn}</p>
                ) : (
                  <CheckInButton action={checkIn.bind(null, serviceId, next.id)} />
                ))}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
