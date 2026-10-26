import "server-only";

import type { Database } from "@/lib/database.types";
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
};

const ROLE_PATH: Record<MemberRole, string> = {
  service_admin: "manage",
  servant: "servant",
  served: "home",
};

/** Every place the user can go after login, in a stable order. */
export async function getDestinations(userId: string): Promise<Destination[]> {
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
    });
  }
  for (const cr of churchRoles.data ?? []) {
    out.push({
      href: `/church/${cr.church_id}`,
      title: cr.churches?.name ?? "",
      subtitle: strings.home.churchAdmin,
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
    });
  }
  return out;
}
