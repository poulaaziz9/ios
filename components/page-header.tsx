import { ChevronRight, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { logout } from "@/app/(auth)/actions";
import { AppLogo } from "@/components/app-logo";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";

export function PageHeader({
  title,
  subtitle,
  backHref,
  children,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        {backHref ? (
          <Link
            href={backHref}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            {/* Points right: "back" in RTL. */}
            <ChevronRight className="size-4" />
            {strings.common.back}
          </Link>
        ) : (
          <Link href="/?pick=1" className="flex items-center gap-2 font-bold text-primary">
            <AppLogo />
            {strings.app.name}
          </Link>
        )}
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/profile">
              <UserRound />
              {strings.profile.title}
            </Link>
          </Button>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              {strings.auth.logout}
            </Button>
          </form>
        </div>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </div>
    </header>
  );
}
