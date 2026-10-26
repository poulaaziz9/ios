import { SidebarMenu, type SidebarGroup } from "@/components/sidebar-menu";
import { requireUserId } from "@/lib/auth/session";
import { getDestinations } from "@/lib/destinations";
import { areaSections, extraSections } from "@/lib/nav";
import { signedUrls } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

/** The ☰ menu: the user's account and every area they can open, with its sections. */
export async function AppSidebar() {
  const userId = await requireUserId();
  const supabase = await createClient();
  const [{ data: profile }, destinations, { data: totals }] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url").eq("id", userId).maybeSingle(),
    getDestinations(userId),
    // The user's own points in each service they serve or are served in.
    supabase.from("v_service_leaderboard").select("service_id, total_points").eq("user_id", userId),
  ]);
  const avatars = await signedUrls("avatars", [profile?.avatar_url]);

  const groups: SidebarGroup[] = destinations.map((d) => ({
    href: d.href,
    title: d.title,
    subtitle: d.subtitle,
    disabled: d.disabled,
    sections: d.disabled || d.kind === "admin" ? [] : [...areaSections(d.kind, d.id), ...extraSections(d.kind, d.id)],
  }));

  return (
    <SidebarMenu
      name={profile?.full_name ?? ""}
      avatarUrl={profile?.avatar_url ? avatars.get(profile.avatar_url) : null}
      groups={groups}
      points={Object.fromEntries((totals ?? []).map((r) => [r.service_id, r.total_points ?? 0]))}
    />
  );
}
