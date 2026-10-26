// The sections of each area, in display order. Shared by the bottom tab bars,
// the admin tab strips and the sidebar, so they never drift apart.
import { strings } from "@/lib/strings";

export type NavIcon = "home" | "users" | "meetings" | "attendance" | "calendar" | "trophy" | "award" | "gift";

export type NavSection = { href: string; label: string; icon?: NavIcon; exact?: boolean };

export type AreaKind = "admin" | "church" | "manage" | "servant" | "home";

export function areaSections(kind: AreaKind, id?: string): NavSection[] {
  switch (kind) {
    case "admin":
      return [{ href: "/admin", label: strings.home.platformAdmin, exact: true }];
    case "church": {
      const base = `/church/${id}`;
      return [
        { href: base, label: strings.church.services, exact: true },
        { href: `${base}/servants`, label: strings.church.servants },
      ];
    }
    case "manage": {
      const base = `/s/${id}/manage`;
      const t = strings.manage.tabs;
      return [
        { href: base, label: t.dashboard, exact: true },
        { href: `${base}/classes`, label: t.classes },
        { href: `${base}/members`, label: t.members },
        { href: `${base}/codes`, label: t.codes },
        { href: `${base}/points`, label: t.points },
        { href: `${base}/meetings`, label: t.meetings },
        { href: `${base}/attendance`, label: t.attendance },
        { href: `${base}/visits`, label: t.visits },
        { href: `${base}/prep`, label: t.prep },
        { href: `${base}/competitions`, label: t.competitions },
        { href: `${base}/posts`, label: t.posts },
        { href: `${base}/gifts`, label: t.gifts },
        { href: `${base}/achievements`, label: t.achievements },
      ];
    }
    case "servant": {
      const base = `/s/${id}/servant`;
      const t = strings.servant.tabs;
      return [
        { href: base, label: t.home, icon: "home", exact: true },
        { href: `${base}/served`, label: t.served, icon: "users" },
        { href: `${base}/meetings`, label: t.meetings, icon: "meetings" },
        { href: `${base}/attendance`, label: t.attendance, icon: "attendance" },
        { href: `${base}/prep`, label: t.prep, icon: "calendar" },
        { href: `${base}/board`, label: t.board, icon: "trophy" },
      ];
    }
    case "home": {
      const base = `/s/${id}/home`;
      const t = strings.served.tabs;
      return [
        { href: base, label: t.home, icon: "home", exact: true },
        { href: `${base}/meetings`, label: t.meetings, icon: "meetings" },
        { href: `${base}/competitions`, label: t.competitions, icon: "trophy" },
        { href: `${base}/progress`, label: t.progress, icon: "award" },
      ];
    }
  }
}

/** Extra places that are not in the bottom tab bar but belong in the sidebar. */
export function extraSections(kind: AreaKind, id?: string): NavSection[] {
  if (kind === "home") return [{ href: `/s/${id}/home/gifts`, label: strings.manage.tabs.gifts, icon: "gift" }];
  return [];
}
