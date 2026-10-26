import "server-only";

import { cache } from "react";

import type { Database } from "@/lib/database.types";
import type { AreaKind } from "@/lib/nav";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

export const LAST_DESTINATION_COOKIE = "last_destination";

type MemberRole = Database["public"]["Enums"]["member_role"];

export type Destination = {
  href: string;
  title: string;
  subtitle: string;
  /** Pending memberships are listed but not enterable yet. */
  disabled?: boolean;
  /** Which area this is (for its sections in the sidebar) and its church/service id. */
  kind: AreaKind;
  id?: string;
};

const ROLE_PATH: Record<MemberRole, "manage" | "servant" | "home"> = {
  service_admin: "manage",
  servant: "servant",
  served: "home",
};

/** Every place the user can go after login, in a stable order. Cached per request. */
export const getDestinations = cache(async (userId: string): Promise<Destination[]> => {
  const supabase = await createClient();
  const [profile, churchRoles, memberships] = await Promise.all([
    supabase.from("profiles").select("is_super_admin").eq("id", userId).maybeSingle(),
    supabase
      .from("church_roles")
      .select("church_id, churches(name)")
      .eq("user_id", userId)
      .eq("role", "church_admin"),
    supabase
      .from("service_members")
      .select("service_id, role, status, services(name, churches(name))")
      .eq("user_id", userId)
      .in("status", ["active", "pending"])
      .order("created_at"),
  ]);

  const out: Destination[] = [];
  if (profile.data?.is_super_admin) {
    out.push({
      href: "/admin",
      title: strings.home.platformAdmin,
      subtitle: strings.home.platformAdminHint,
      kind: "admin",
    });
  }
  for (const cr of churchRoles.data ?? []) {
    out.push({
      href: `/church/${cr.church_id}`,
      title: cr.churches?.name ?? "",
      subtitle: strings.home.churchAdmin,
      kind: "church",
      id: cr.church_id,
    });
  }
  for (const m of memberships.data ?? []) {
    const pending = m.status === "pending";
    out.push({
      href: `/s/${m.service_id}/${ROLE_PATH[m.role]}`,
      title: m.services?.name ?? "",
      subtitle: pending
        ? strings.home.pending
        : [strings.home.roles[m.role], m.services?.churches?.name].filter(Boolean).join(" · "),
      disabled: pending,
      kind: ROLE_PATH[m.role],
      id: m.service_id,
    });
  }
  return out;
});
