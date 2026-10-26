"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function NavTabs({
  tabs,
}: {
  tabs: { href: string; label: string; exact?: boolean }[];
}) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 rounded-lg bg-muted p-1">
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-center text-sm font-medium text-muted-foreground transition-colors",
              active && "bg-background text-foreground shadow-sm",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
