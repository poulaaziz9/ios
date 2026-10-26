"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { CountBadge } from "@/components/count-badge";
import { cn } from "@/lib/utils";

export function NavTabs({
  tabs,
}: {
  tabs: { href: string; label: string; exact?: boolean; badge?: number }[];
}) {
  const pathname = usePathname();
  const nav = useRef<HTMLElement>(null);

  // Long strips scroll sideways; keep the open tab in view.
  useEffect(() => {
    nav.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);

  return (
    <nav ref={nav} className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none]">
      <div className="flex min-w-full gap-1 rounded-lg bg-muted p-1">
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
              "flex-1 rounded-md px-3 py-2 text-center text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors",
              active && "bg-background text-foreground shadow-sm",
            )}
          >
            {tab.label}
            {!!tab.badge && <CountBadge count={tab.badge} className="ms-1.5" />}
          </Link>
        );
      })}
      </div>
    </nav>
  );
}
