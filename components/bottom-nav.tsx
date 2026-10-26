"use client";

import { Award, CalendarCheck, CalendarDays, ClipboardCheck, Home, Trophy, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ICONS = {
  home: Home,
  users: Users,
  calendar: CalendarCheck,
  meetings: CalendarDays,
  attendance: ClipboardCheck,
  trophy: Trophy,
  award: Award,
} satisfies Record<string, LucideIcon>;

export type BottomNavItem = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  exact?: boolean;
};

/** App-style tab bar fixed to the bottom of the screen (servant / served). */
export function BottomNav({ items }: { items: BottomNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-2xl">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[11px] whitespace-nowrap text-muted-foreground sm:text-xs",
                  active && "font-semibold text-primary",
                )}
              >
                <Icon className="size-6" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
