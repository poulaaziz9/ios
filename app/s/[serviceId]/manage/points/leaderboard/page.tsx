import { Leaderboard } from "@/components/leaderboard";
import { Segmented } from "@/components/segmented";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

const t = strings.points.board;

export default async function ManageLeaderboardPage({
  params,
  searchParams,
}: PageProps<"/s/[serviceId]/manage/points/leaderboard">) {
  const { serviceId } = await params;
  const sp = await searchParams;
  const role = sp.role === "servant" ? "servant" : "served";
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("service_id", serviceId)
    .order("sort_order");
  const classId = (classes ?? []).find((c) => c.id === sp.class)?.id ?? null;

  const href = (next: { role?: string; class?: string | null }) => {
    const q = new URLSearchParams();
    const r = next.role ?? role;
    const c = next.class === undefined ? classId : next.class;
    if (r !== "served") q.set("role", r);
    if (c) q.set("class", c);
    const s = q.toString();
    return `/s/${serviceId}/manage/points/leaderboard${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={role}
          options={[
            { value: "served", label: t.served, href: href({ role: "served" }) },
            { value: "servant", label: t.servant, href: href({ role: "servant" }) },
          ]}
        />
        <Segmented
          value={classId ?? "all"}
          options={[
            { value: "all", label: t.service, href: href({ class: null }) },
            ...(classes ?? []).map((c) => ({ value: c.id, label: c.name, href: href({ class: c.id }) })),
          ]}
        />
      </div>
      <div className="rounded-xl border bg-card p-3 shadow-sm">
        <Leaderboard serviceId={serviceId} role={role} classId={classId} />
      </div>
    </>
  );
}
