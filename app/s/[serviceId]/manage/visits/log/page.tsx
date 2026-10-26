import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { SubmitButton } from "@/components/submit-button";
import { isUuid } from "@/lib/auth/session";
import { formatRelative } from "@/lib/format";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { deleteVisit } from "../../actions";

const t = strings.visits;

export default async function VisitLogPage({
  params,
  searchParams,
}: PageProps<"/s/[serviceId]/manage/visits/log">) {
  const { serviceId } = await params;
  const servantFilter = String((await searchParams).servant ?? "");
  const supabase = await createClient();

  let query = supabase
    .from("visits")
    .select(
      "id, visit_type, visited_at, notes, servant:profiles!visits_servant_id_fkey(full_name), served:profiles!visits_served_id_fkey(full_name)",
    )
    .eq("service_id", serviceId)
    .order("visited_at", { ascending: false })
    .limit(100);
  if (isUuid(servantFilter)) query = query.eq("servant_id", servantFilter);

  const [{ data: visits }, { data: roster }] = await Promise.all([
    query,
    supabase.rpc("service_roster", { p_service: serviceId }),
  ]);
  const servants = (roster ?? []).filter((m) => m.role === "servant");

  return (
    <>
      {/* GET form: the select navigates to ?servant=… */}
      <form>
        <AutoSubmitSelect name="servant" defaultValue={servantFilter} aria-label={t.filterServant} className="w-56">
          <option value="">{t.filterServant}</option>
          {servants.map((s) => (
            <option key={s.user_id} value={s.user_id}>
              {s.full_name}
            </option>
          ))}
        </AutoSubmitSelect>
      </form>

      {!visits?.length ? (
        <p className="text-sm text-muted-foreground">{t.noVisits}</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border bg-card px-4 shadow-sm">
          {visits.map((v) => (
            <li key={v.id} className="flex items-start gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm">
                  {strings.manage.visitBy(v.servant?.full_name ?? "", v.served?.full_name ?? "")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {strings.manage.visitTypes[v.visit_type]} · {formatRelative(v.visited_at)}
                </div>
                {v.notes && <p className="mt-1 text-sm whitespace-pre-line">{v.notes}</p>}
              </div>
              <form action={deleteVisit.bind(null, serviceId, v.id)}>
                <SubmitButton variant="ghost" size="sm" confirm={t.deleteVisitConfirm}>
                  {t.deleteVisit}
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
