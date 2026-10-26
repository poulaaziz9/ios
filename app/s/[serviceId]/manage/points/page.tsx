import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { MemberPicker } from "@/components/member-picker";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { isUuid } from "@/lib/auth/session";
import { formatRelative } from "@/lib/format";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { awardPoints, reversePoints } from "../actions";

const t = strings.points;

export default async function PointsLedgerPage({
  params,
  searchParams,
}: PageProps<"/s/[serviceId]/manage/points">) {
  const { serviceId } = await params;
  const userFilter = String((await searchParams).user ?? "");
  const supabase = await createClient();

  let ledgerQuery = supabase
    .from("points_ledger")
    .select(
      "id, user_id, points, reason, note, source_id, created_at, user:profiles!points_ledger_user_id_fkey(full_name), author:profiles!points_ledger_created_by_fkey(full_name)",
    )
    .eq("service_id", serviceId)
    .order("created_at", { ascending: false })
    .limit(60);
  if (isUuid(userFilter)) ledgerQuery = ledgerQuery.eq("user_id", userFilter);

  const [{ data: roster }, { data: classes }, { data: entries }] = await Promise.all([
    supabase.rpc("service_roster", { p_service: serviceId }),
    supabase.from("classes").select("id, name").eq("service_id", serviceId).order("sort_order"),
    ledgerQuery,
  ]);

  // Which shown entries were already corrected, and which are corrections
  // themselves (their source is another ledger entry).
  const ids = (entries ?? []).map((e) => e.id);
  const sourceIds = (entries ?? []).map((e) => e.source_id).filter((id): id is string => !!id);
  const [{ data: reversals }, { data: sourceEntries }] = await Promise.all([
    ids.length
      ? supabase.from("points_ledger").select("source_id").in("source_id", ids)
      : Promise.resolve({ data: [] as { source_id: string | null }[] }),
    sourceIds.length
      ? supabase.from("points_ledger").select("id").in("id", sourceIds)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ]);
  const reversed = new Set((reversals ?? []).map((r) => r.source_id));
  const corrections = new Set((sourceEntries ?? []).map((r) => r.id));
  const members = (roster ?? []).filter(
    (m) => m.status === "active" && (m.role === "served" || m.role === "servant"),
  );
  const filterName = members.find((m) => m.user_id === userFilter)?.full_name;
  const base = `/s/${serviceId}/manage/points`;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t.award}</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={awardPoints.bind(null, serviceId)} className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">{t.awardHint}</p>
            <MemberPicker
              classes={classes ?? []}
              members={members.map((m) => ({
                id: m.user_id,
                name: m.full_name,
                classId: m.class_id,
                role: m.role,
              }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="points">{t.pointsLabel}</Label>
                <Input id="points" name="points" type="number" inputMode="numeric" dir="ltr" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="reason">{t.reasonLabel}</Label>
                <NativeSelect id="reason" name="reason" defaultValue="manual">
                  <option value="manual">{t.reasons.manual}</option>
                  <option value="attendance">{t.reasons.attendance}</option>
                </NativeSelect>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="note">{t.note}</Label>
              <Input id="note" name="note" />
            </div>
            <SubmitButton className="self-start">{t.awardSubmit}</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{filterName ? t.filteredBy(filterName) : t.ledger}</h2>
          {filterName && (
            <Link href={base} className="text-sm text-primary">
              {t.showAll}
            </Link>
          )}
        </div>
        {!entries?.length ? (
          <p className="text-sm text-muted-foreground">{t.noEntries}</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-xl border bg-card px-4 shadow-sm">
            {entries.map((e) => {
              const isCorrection = !!e.source_id && corrections.has(e.source_id);
              return (
                <li key={e.id} className="flex items-center gap-3 py-3">
                  <span
                    className={cn(
                      "w-14 shrink-0 text-center text-lg font-bold tabular-nums",
                      e.points > 0 ? "text-emerald-600" : "text-destructive",
                    )}
                    dir="ltr"
                  >
                    {e.points > 0 ? "+" : ""}
                    {e.points}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`${base}?user=${e.user_id}`} className="font-medium hover:underline">
                      {e.user?.full_name}
                    </Link>
                    <div className="truncate text-xs text-muted-foreground">
                      {[t.reasons[e.reason], e.note, formatRelative(e.created_at), e.author?.full_name && t.by(e.author.full_name)]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  {reversed.has(e.id) ? (
                    <span className="text-xs text-muted-foreground">{t.reversed}</span>
                  ) : (
                    !isCorrection && (
                      <form action={reversePoints.bind(null, serviceId, e.id)}>
                        <SubmitButton variant="ghost" size="sm" confirm={t.reverseConfirm}>
                          {t.reverse}
                        </SubmitButton>
                      </form>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
