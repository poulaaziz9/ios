import { AchievementIcon } from "@/components/achievement-icon";
import { Leaderboard } from "@/components/leaderboard";
import { Segmented } from "@/components/segmented";
import { requireUserId } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const t = strings.progress;

export default async function ServedProgressPage({
  params,
  searchParams,
}: PageProps<"/s/[serviceId]/home/progress">) {
  const { serviceId } = await params;
  const scope = (await searchParams).board === "class" ? "class" : "service";
  const userId = await requireUserId();
  const supabase = await createClient();
  const [{ data: achievements }, { data: earned }, { data: points }] = await Promise.all([
    supabase.from("achievements").select("id, name, description, icon").eq("service_id", serviceId).order("created_at"),
    supabase.from("user_achievements").select("achievement_id, earned_at").eq("user_id", userId),
    supabase.rpc("my_points", { p_service: serviceId }),
  ]);
  const earnedAt = new Map((earned ?? []).map((e) => [e.achievement_id, e.earned_at]));
  const classId = points?.find((p) => p.role === "served")?.class_id ?? null;
  const base = `/s/${serviceId}/home/progress`;

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t.achievements}</h2>
        {!achievements?.length ? (
          <p className="text-sm text-muted-foreground">{t.noAchievements}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {achievements.map((a) => {
              const at = earnedAt.get(a.id);
              return (
                <li
                  key={a.id}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border bg-card p-3 text-center shadow-sm",
                    !at && "opacity-50 grayscale",
                  )}
                >
                  <AchievementIcon icon={a.icon} className="size-10" />
                  <div className="font-semibold">{a.name}</div>
                  {a.description && <div className="text-xs text-muted-foreground">{a.description}</div>}
                  <div className={cn("text-xs font-medium", at ? "text-emerald-600" : "text-muted-foreground")}>
                    {at ? `${t.earned} · ${formatDate(at)}` : t.locked}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t.leaderboard}</h2>
          {classId && (
            <Segmented
              value={scope}
              options={[
                { value: "service", label: strings.points.board.service, href: base },
                { value: "class", label: strings.points.board.class, href: `${base}?board=class` },
              ]}
            />
          )}
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <Leaderboard
            serviceId={serviceId}
            role="served"
            classId={scope === "class" ? classId : null}
            highlightUserId={userId}
          />
        </div>
      </section>
    </>
  );
}
