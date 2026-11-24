"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth/session";
import { getDestinations, LAST_DESTINATION_COOKIE } from "@/lib/destinations";
import { createClient } from "@/lib/supabase/server";

/** Remember the picked service/admin area and go there. */
export async function chooseDestination(formData: FormData) {
  const href = String(formData.get("href") ?? "");
  const userId = await requireUserId();
  const allowed = (await getDestinations(userId)).some((d) => d.href === href && !d.disabled);
  if (!allowed) redirect("/?pick=1");

  (await cookies()).set(LAST_DESTINATION_COOKIE, href, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(href);
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

/** Save this device's push subscription for the signed-in user. */
export async function savePushSubscription(sub: { endpoint: string; p256dh: string; auth: string }) {
  await requireUserId();
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: sub.endpoint,
    p_p256dh: sub.p256dh,
    p_auth: sub.auth,
  });
  return { ok: !error };
}

/** Forget this device (turning notifications off, or signing out). */
export async function removePushSubscription(endpoint: string) {
  const supabase = await createClient();
  await supabase.rpc("remove_push_subscription", { p_endpoint: endpoint });
}
