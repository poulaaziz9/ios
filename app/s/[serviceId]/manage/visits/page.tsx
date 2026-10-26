import { IdleServantsAlert } from "@/components/alert-cards";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { Segmented } from "@/components/segmented";
import { formatRelative, isOlderThan } from "@/lib/format";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { assignServant } from "../actions";

const t = strings.visits;
const DAY_FILTERS = [7, 14, 30];

export default async function VisitAssignmentsPage({
  params,
  searchParams,
}: PageProps<"/s/[serviceId]/manage/visits">) {
  const { serviceId } = await params;
  const daysParam = Number((await searchParams).days);
  const days = DAY_FILTERS.includes(daysParam) ? daysParam : null;
  const supabase = await createClient();
  const [{ data: overview }, { data: roster }, { data: classes }] = await Promise.all([
    supabase.rpc("visit_overview", { p_service: serviceId }),
    supabase.rpc("service_roster", { p_service: serviceId }),
    supabase.from("classes").select("id, name").eq("service_id", serviceId),
  ]);
  const servants = (roster ?? []).filter((m) => m.role === "servant" && m.status === "active");
  const className = new Map((classes ?? []).map((c) => [c.id, c.name]));
  const rows = (overview ?? []).filter((r) => !days || isOlderThan(r.last_visit_at, days));
  const base = `/s/${serviceId}/manage/visits`;

  return (
    <>
      <IdleServantsAlert serviceId={serviceId} />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">{t.notVisitedFor}</span>
        <Segmented
          value={days ? String(days) : "all"}
          options={[
            { value: "all", label: t.all, href: base },
            ...DAY_FILTERS.map((d) => ({ value: String(d), label: t.days(d), href: `${base}?days=${d}` })),
          ]}
        />
        {days && <span className="font-medium text-destructive">{t.overdueCount(rows.length)}</span>}
      </div>
      {!servants.length && <p className="text-sm text-muted-foreground">{t.noServants}</p>}

      {!rows.length ? (
        <p className="text-sm text-muted-foreground">{t.noServed}</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border bg-card px-4 shadow-sm">
          {rows.map((r) => {
            const overdue = isOlderThan(r.last_visit_at, 14);
            return (
              <li key={r.served_id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="font-medium">{r.full_name}</div>
                  <div className={cn("text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>
                    {r.last_visit_at
                      ? strings.servant.lastVisit(formatRelative(r.last_visit_at))
                      : strings.servant.neverVisited}
                    {r.class_id && <span className="text-muted-foreground"> · {className.get(r.class_id)}</span>}
                  </div>
                </div>
                <form action={assignServant.bind(null, serviceId, r.served_id)}>
                  <AutoSubmitSelect
                    name="servant_id"
                    defaultValue={r.servant_id ?? ""}
                    aria-label={t.servantFor}
                    className="h-9 w-44"
                  >
                    <option value="">{t.unassigned}</option>
                    {servants.map((s) => (
                      <option key={s.user_id} value={s.user_id}>
                        {s.full_name}
                      </option>
                    ))}
                  </AutoSubmitSelect>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
