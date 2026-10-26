"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth/session";
import { getDestinations, LAST_DESTINATION_COOKIE } from "@/lib/destinations";

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
