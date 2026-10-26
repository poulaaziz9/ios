import { ActionButton } from "@/components/action-button";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/format";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { decideRedemption } from "../actions";

const t = strings.gifts;
const ORDER = { requested: 0, approved: 1, delivered: 2, rejected: 3 } as const;

export default async function GiftRequestsPage({ params }: PageProps<"/s/[serviceId]/manage/gifts">) {
  const { serviceId } = await params;
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("gift_redemptions")
    .select(
      "id, status, created_at, gifts!inner(name, cost_points, service_id), user:profiles!gift_redemptions_user_id_fkey(full_name)",
    )
    .eq("gifts.service_id", serviceId)
    .order("created_at", { ascending: false })
    .limit(100);

  const sorted = [...(requests ?? [])].sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  if (!sorted.length) return <p className="text-sm text-muted-foreground">{t.noRequests}</p>;

  return (
    <ul className="flex flex-col divide-y rounded-xl border bg-card px-4 shadow-sm">
      {sorted.map((r) => (
        <li key={r.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="font-medium">
              {r.user?.full_name} · {r.gifts.name}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={r.status === "requested" ? "default" : "secondary"}>{t.status[r.status]}</Badge>
              {strings.manage.points(r.gifts.cost_points)} · {formatRelative(r.created_at)}
            </div>
          </div>
          <div className="flex gap-2">
            {r.status === "requested" && (
              <ActionButton action={decideRedemption.bind(null, serviceId, r.id, "approved")} size="sm">
                {t.approve}
              </ActionButton>
            )}
            {r.status === "approved" && (
              <ActionButton action={decideRedemption.bind(null, serviceId, r.id, "delivered")} size="sm">
                {t.deliver}
              </ActionButton>
            )}
            {(r.status === "requested" || r.status === "approved") && (
              <ActionButton
                action={decideRedemption.bind(null, serviceId, r.id, "rejected")}
                size="sm"
                variant="ghost"
                confirm={t.rejectConfirm}
              >
                {t.reject}
              </ActionButton>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
