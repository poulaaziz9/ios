import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/** Gift redemptions of a service still waiting for the admin. Cached per request. */
export const pendingGiftRequests = cache(async (serviceId: string): Promise<number> => {
  const supabase = await createClient();
  const { count } = await supabase
    .from("gift_redemptions")
    .select("id, gifts!inner(service_id)", { count: "exact", head: true })
    .eq("gifts.service_id", serviceId)
    .eq("status", "requested");
  return count ?? 0;
});
