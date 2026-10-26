import "server-only";

import { cache } from "react";

import { pendingGiftRequests } from "@/lib/gift-requests";
import type { AreaKind } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";

// Counts behind the notification badges. Each is cached per request, so the
// layout, the sidebar and the page can all ask without repeating the query.

/** Kids who missed more than two meetings in a row (a servant: only their own kids). */
export const absentServed = cache(async (serviceId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("absent_served", { p_service: serviceId });
  return data ?? [];
});

/** Servants with no visit for more than 10 days (service admins only). */
export const idleServants = cache(async (serviceId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("idle_servants", { p_service: serviceId });
  return data ?? [];
});

/** Complaints & suggestions waiting for the super admin's reply. */
export const openFeedbackCount = cache(async () => {
  const supabase = await createClient();
  const { count } = await supabase.from("feedback").select("id", { count: "exact", head: true }).eq("status", "open");
  return count ?? 0;
});

/** Threads of a church with a reply its admins haven't opened yet. */
export const unseenFeedbackCount = cache(async (churchId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("feedback")
    .select("last_message_at, church_seen_at")
    .eq("church_id", churchId)
    .eq("status", "answered");
  return (data ?? []).filter((f) => f.last_message_at > f.church_seen_at).length;
});

/** Badge counts for an area's sections, keyed by section href (see withBadges). */
export async function areaBadges(kind: AreaKind, id?: string): Promise<Record<string, number>> {
  switch (kind) {
    case "manage": {
      const base = `/s/${id}/manage`;
      const [requests, absent, idle] = await Promise.all([
        pendingGiftRequests(id!),
        absentServed(id!),
        idleServants(id!),
      ]);
      return { [`${base}/requests`]: requests, [`${base}/attendance`]: absent.length, [`${base}/visits`]: idle.length };
    }
    case "servant":
      return { [`/s/${id}/servant/attendance`]: (await absentServed(id!)).length };
    case "church":
      return { [`/church/${id}/feedback`]: await unseenFeedbackCount(id!) };
    case "admin":
      return { "/admin/feedback": await openFeedbackCount() };
    default:
      return {};
  }
}
