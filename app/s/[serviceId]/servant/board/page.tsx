import { Leaderboard } from "@/components/leaderboard";
import { Segmented } from "@/components/segmented";
import { requireUserId } from "@/lib/auth/session";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

const t = strings.points.board;

export default async function ServantBoardPage({
  params,
  searchParams,
}: PageProps<"/s/[serviceId]/servant/board">) {
  const { serviceId } = await params;
  const scope = (await searchParams).scope === "class" ? "class" : "service";
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data: points } = await supabase.rpc("my_points", { p_service: serviceId });
  const classId = points?.find((p) => p.role === "servant")?.class_id ?? null;
  const base = `/s/${serviceId}/servant/board`;

  return (
    <>
      {classId && (
        <Segmented
          value={scope}
          options={[
            { value: "service", label: t.service, href: base },
            { value: "class", label: t.class, href: `${base}?scope=class` },
          ]}
        />
      )}
      <div className="rounded-xl border bg-card p-3 shadow-sm">
        <Leaderboard
          serviceId={serviceId}
          role="servant"
          classId={scope === "class" ? classId : null}
          highlightUserId={userId}
        />
      </div>
    </>
  );
}
