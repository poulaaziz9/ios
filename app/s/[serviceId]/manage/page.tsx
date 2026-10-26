import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelative } from "@/lib/format";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

const t = strings.manage;

export default async function ManageDashboardPage({
  params,
}: PageProps<"/s/[serviceId]/manage">) {
  const { serviceId } = await params;
  const supabase = await createClient();

  const members = (role: "servant" | "served", status: "active" | "pending") =>
    supabase
      .from("service_members")
      .select("id", { count: "exact", head: true })
      .eq("service_id", serviceId)
      .eq("role", role)
      .eq("status", status);

  const [classes, servants, served, pending, top, visits] = await Promise.all([
    supabase.from("classes").select("id", { count: "exact", head: true }).eq("service_id", serviceId),
    members("servant", "active"),
    members("served", "active"),
    members("served", "pending"),
    supabase
      .from("v_service_leaderboard")
      .select("user_id, full_name, total_points, rank")
      .eq("service_id", serviceId)
      .eq("role", "served")
      .order("rank")
      .limit(5),
    supabase
      .from("visits")
      .select(
        "id, visit_type, visited_at, servant:profiles!visits_servant_id_fkey(full_name), served:profiles!visits_served_id_fkey(full_name)",
      )
      .eq("service_id", serviceId)
      .order("visited_at", { ascending: false })
      .limit(5),
  ]);

  const stats = [
    { label: t.stats.classes, value: classes.count ?? 0, href: "classes" },
    { label: t.stats.servants, value: servants.count ?? 0, href: "members" },
    { label: t.stats.served, value: served.count ?? 0, href: "members" },
    { label: t.stats.pending, value: pending.count ?? 0, href: "members" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={`/s/${serviceId}/manage/${s.href}`}
            className="rounded-xl border bg-card p-4 shadow-sm hover:bg-accent"
          >
            <div className="text-3xl font-bold">{s.value.toLocaleString("ar-EG")}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.topPoints}</CardTitle>
        </CardHeader>
        <CardContent>
          {!top.data?.length || top.data.every((r) => r.total_points === 0) ? (
            <p className="text-sm text-muted-foreground">{t.noPoints}</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {top.data.map((r) => (
                <li key={r.user_id} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <span className="w-6 text-center font-bold text-muted-foreground">
                      {(r.rank ?? 0).toLocaleString("ar-EG")}
                    </span>
                    {r.full_name}
                  </span>
                  <span className="text-sm font-medium">{t.points(r.total_points ?? 0)}</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.recentVisits}</CardTitle>
        </CardHeader>
        <CardContent>
          {!visits.data?.length ? (
            <p className="text-sm text-muted-foreground">{t.noVisits}</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {visits.data.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3">
                  <span>
                    {t.visitBy(v.servant?.full_name ?? "", v.served?.full_name ?? "")}
                    <span className="text-muted-foreground"> · {t.visitTypes[v.visit_type]}</span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">{formatRelative(v.visited_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
