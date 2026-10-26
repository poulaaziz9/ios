"use client";

import { ChevronDown, Menu, Star, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AppLogo } from "@/components/app-logo";
import { Avatar } from "@/components/avatar";
import { CountBadge } from "@/components/count-badge";
import { Button } from "@/components/ui/button";
import type { NavSection } from "@/lib/nav";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

const t = strings.sidebar;

export type SidebarGroup = {
  href: string;
  title: string;
  subtitle: string;
  disabled?: boolean;
  sections: NavSection[];
};

const isActive = (pathname: string, s: { href: string; exact?: boolean }) =>
  s.exact ? pathname === s.href : pathname === s.href || pathname.startsWith(`${s.href}/`);

/** ☰ button plus a drawer sliding in from the start (right in RTL) edge. */
export function SidebarMenu({
  name,
  avatarUrl,
  groups,
  points,
}: {
  name: string;
  avatarUrl?: string | null;
  groups: SidebarGroup[];
  /** The user's total points per service id. */
  points: Record<string, number>;
}) {
  const pathname = usePathname();
  // Points of the service being viewed, or of the only service the user has.
  const currentService = /^\/s\/([^/]+)/.exec(pathname)?.[1];
  const serviceIds = Object.keys(points);
  const shownPoints =
    currentService && currentService in points
      ? points[currentService]
      : serviceIds.length === 1
        ? points[serviceIds[0]]
        : null;
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Close after navigating.
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const badgeSum = (sections: NavSection[]) => sections.reduce((n, s) => n + (s.badge ?? 0), 0);
  const totalBadge = groups.reduce((n, g) => n + badgeSum(g.sections), 0);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t.open}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="relative"
      >
        <Menu className="size-6" />
        {totalBadge > 0 && <CountBadge count={totalBadge} className="absolute -end-1 -top-1" />}
      </Button>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={strings.app.name}
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-80 max-w-[85vw] flex-col bg-background shadow-xl transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <span className="flex items-center gap-2 font-bold text-primary">
            <AppLogo />
            {strings.app.name}
          </span>
          <Button variant="ghost" size="icon" aria-label={t.close} onClick={() => setOpen(false)}>
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          <Link
            href="/profile"
            className={cn(
              "mb-2 flex items-center gap-3 rounded-xl border bg-card p-3",
              pathname === "/profile" && "border-primary/40 bg-primary/10",
            )}
          >
            <Avatar url={avatarUrl} name={name || "؟"} className="size-10" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-semibold">{name}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <UserRound className="size-3.5" />
                {t.myAccount}
              </span>
            </span>
            {shownPoints !== null && (
              <span className="flex shrink-0 flex-col items-center rounded-lg bg-primary/10 px-2.5 py-1 text-primary">
                <span className="flex items-center gap-1 text-lg leading-none font-bold">
                  <Star className="size-4 fill-current" />
                  {shownPoints.toLocaleString("ar-EG")}
                </span>
                <span className="text-[11px]">{t.points}</span>
              </span>
            )}
          </Link>

          {groups.map((g) => {
            const here = isActive(pathname, { href: g.href }) || g.sections.some((s) => isActive(pathname, s));
            if (g.disabled) {
              return (
                <div key={g.href} className="rounded-lg px-3 py-2 opacity-60">
                  <div className="font-medium">{g.title}</div>
                  <div className="text-xs text-muted-foreground">{t.pending}</div>
                </div>
              );
            }
            if (!g.sections.length) {
              return (
                <Link
                  key={g.href}
                  href={g.href}
                  className={cn("rounded-lg px-3 py-2 hover:bg-accent", here && "bg-primary/10 text-primary")}
                >
                  <div className="font-medium">{g.title}</div>
                  <div className="text-xs text-muted-foreground">{g.subtitle}</div>
                </Link>
              );
            }
            return (
              <details key={g.href} open={here} className="group rounded-lg">
                <summary
                  className={cn(
                    "flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2 hover:bg-accent [&::-webkit-details-marker]:hidden",
                    here && "text-primary",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{g.title}</span>
                    <span className="block text-xs text-muted-foreground">{g.subtitle}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {badgeSum(g.sections) > 0 && (
                      <CountBadge count={badgeSum(g.sections)} className="group-open:hidden" />
                    )}
                    <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                  </span>
                </summary>
                <ul className="ms-3 mt-1 flex flex-col gap-0.5 border-s ps-2">
                  {g.sections.map((s) => (
                    <li key={s.href}>
                      <Link
                        href={s.href}
                        aria-current={isActive(pathname, s) ? "page" : undefined}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
                          isActive(pathname, s) && "bg-primary/10 font-semibold text-primary",
                        )}
                      >
                        {s.label}
                        {!!s.badge && <CountBadge count={s.badge} />}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
