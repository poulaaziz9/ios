import "server-only";

import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/** The signed-in user's id, or a redirect to /login. Cached per request. */
export const requireUserId = cache(async (): Promise<string> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims.sub;
  if (!id) redirect("/login");
  return id;
});

// Layout guards. RLS is the real enforcement; these only decide whether to
// render the page at all. Unauthorized users get a 404 rather than a hint
// that the church/service exists.

export const requireSuperAdmin = cache(async () => {
  await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_super_admin");
  if (!data) notFound();
});

export const requireChurchAdmin = cache(async (churchId: string) => {
  await requireUserId();
  if (!isUuid(churchId)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_church_admin", { p_church: churchId });
  if (!data) notFound();
});

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export type ServiceArea = "manage" | "servant" | "home";

/** Guard for /s/[serviceId]/<area>: admins manage, servants serve, served kids see home. */
export const requireServiceArea = cache(async (serviceId: string, area: ServiceArea) => {
  await requireUserId();
  if (!isUuid(serviceId)) notFound();
  const supabase = await createClient();
  const { data } =
    area === "manage"
      ? await supabase.rpc("is_service_admin", { p_service: serviceId })
      : await supabase.rpc("has_service_role", {
          p_service: serviceId,
          p_role: area === "servant" ? "servant" : "served",
        });
  if (!data) notFound();
});
