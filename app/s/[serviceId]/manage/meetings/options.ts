import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Active servants (possible speakers) and classes, for the meeting form. */
export async function meetingFormOptions(serviceId: string) {
  const supabase = await createClient();
  const [{ data: roster }, { data: classes }] = await Promise.all([
    supabase.rpc("service_roster", { p_service: serviceId }),
    supabase.from("classes").select("id, name").eq("service_id", serviceId).order("sort_order"),
  ]);
  const servants = (roster ?? [])
    .filter((m) => m.role === "servant" && m.status === "active")
    .map((m) => ({ id: m.user_id, name: m.full_name }));
  return { servants, classes: classes ?? [] };
}
