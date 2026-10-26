/* eslint-disable @next/next/no-img-element -- short-lived signed URLs */
import { ChevronRight, Gift } from "lucide-react";
import Link from "next/link";

import { ActionButton } from "@/components/action-button";
import { Badge } from "@/components/ui/badge";
import { requireUserId } from "@/lib/auth/session";
import { formatRelative } from "@/lib/format";
import { signedUrls } from "@/lib/storage";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { redeemGift } from "../actions";

const t = strings.gifts;

export default async function ServedGiftsPage({ params }: PageProps<"/s/[serviceId]/home/gifts">) {
  const { serviceId } = await params;
  const userId = await requireUserId();
  const supabase = await createClient();
  const [{ data: available }, { data: gifts }, { data: mine }] = await Promise.all([
    supabase.rpc("my_available_points", { p_service: serviceId }),
    // RLS: members only see active gifts.
    supabase
      .from("gifts")
      .select("id, name, image_url, cost_points, stock")
      .eq("service_id", serviceId)
      .order("cost_points"),
    supabase
      .from("gift_redemptions")
      .select("id, status, created_at, gifts!inner(name, service_id)")
      .eq("user_id", userId)
      .eq("gifts.service_id", serviceId)
      .order("created_at", { ascending: false }),
  ]);
  const images = await signedUrls("service-media", (gifts ?? []).map((g) => g.image_url));
  const points = available ?? 0;

  return (
    <>
      <Link
        href={`/s/${serviceId}/home`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
        {strings.served.tabs.home}
      </Link>
      <div className="rounded-xl bg-primary p-4 text-center text-lg font-semibold text-primary-foreground">
        {t.available(points)}
      </div>

      {!gifts?.length ? (
        <p className="text-sm text-muted-foreground">{t.noGifts}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {gifts.map((g) => {
            const soldOut = g.stock !== null && g.stock <= 0;
            const affordable = points >= g.cost_points;
            return (
              <li key={g.id} className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
                <span className="flex aspect-square items-center justify-center bg-muted">
                  {g.image_url && images.get(g.image_url) ? (
                    <img src={images.get(g.image_url)} alt="" className="size-full object-cover" />
                  ) : (
                    <Gift className="size-10 text-muted-foreground" />
                  )}
                </span>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <div className="font-semibold">{g.name}</div>
                  <div className="text-sm font-medium text-primary">{strings.manage.points(g.cost_points)}</div>
                  <div className="mt-auto">
                    {soldOut ? (
                      <Badge variant="secondary">{t.soldOut}</Badge>
                    ) : !affordable ? (
                      <span className="text-xs text-muted-foreground">{t.notEnough}</span>
                    ) : (
                      <ActionButton
                        action={redeemGift.bind(null, serviceId, g.id)}
                        size="sm"
                        className="w-full"
                        confirm={t.redeemConfirm(g.name, g.cost_points)}
                      >
                        {t.redeem}
                      </ActionButton>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!!mine?.length && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t.myRequests}</h2>
          <ul className="flex flex-col divide-y rounded-xl border bg-card px-4 shadow-sm">
            {mine.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                <span>{r.gifts.name}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {formatRelative(r.created_at)}
                  <Badge variant={r.status === "rejected" ? "secondary" : "default"}>{t.status[r.status]}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
