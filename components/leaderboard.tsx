import { Avatar } from "@/components/avatar";
import { signedUrls } from "@/lib/storage";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const t = strings.points;
const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * Ranked list from v_service_leaderboard / v_class_leaderboard (both already
 * restricted to services the viewer belongs to). Separate per role.
 */
export async function Leaderboard({
  serviceId,
  role,
  classId,
  highlightUserId,
  limit = 100,
}: {
  serviceId: string;
  role: "served" | "servant";
  /** When set, ranks within this class instead of the whole service. */
  classId?: string | null;
  highlightUserId?: string;
  limit?: number;
}) {
  const supabase = await createClient();
  const query = classId
    ? supabase
        .from("v_class_leaderboard")
        .select("user_id, full_name, avatar_url, total_points, rank")
        .eq("class_id", classId)
    : supabase
        .from("v_service_leaderboard")
        .select("user_id, full_name, avatar_url, total_points, rank")
        .eq("service_id", serviceId);
  const { data: rows } = await query.eq("role", role).order("rank").order("full_name").limit(limit);

  if (!rows?.length) {
    return <p className="text-sm text-muted-foreground">{t.board.empty}</p>;
  }
  const avatars = await signedUrls("avatars", rows.map((r) => r.avatar_url));

  return (
    <ol className="flex flex-col gap-1">
      {rows.map((r) => {
        const me = r.user_id === highlightUserId;
        const rank = r.rank ?? 0;
        return (
          <li
            key={r.user_id}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2 py-2",
              me && "bg-primary/10 font-semibold ring-1 ring-primary/30",
            )}
          >
            <span className="w-7 text-center text-lg font-bold text-muted-foreground">
              {MEDALS[rank - 1] ?? rank.toLocaleString("ar-EG")}
            </span>
            <Avatar url={r.avatar_url ? avatars.get(r.avatar_url) : null} name={r.full_name ?? ""} className="size-9" />
            <span className="min-w-0 flex-1 truncate">
              {r.full_name}
              {me && <span className="ms-1 text-xs text-primary">({t.board.you})</span>}
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {strings.manage.points(r.total_points ?? 0)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
