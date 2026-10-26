import { ChevronLeft, QrCode } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUserId } from "@/lib/auth/session";
import { getDestinations, LAST_DESTINATION_COOKIE } from "@/lib/destinations";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { chooseDestination } from "./actions";

// Post-login landing: the "اختار الخدمة" picker. Goes straight to the only
// place the user can go, or to their last choice, unless ?pick=1.
export default async function HomePage({ searchParams }: PageProps<"/">) {
  const userId = await requireUserId();
  const destinations = await getDestinations(userId);
  const enterable = destinations.filter((d) => !d.disabled);
  const picking = (await searchParams).pick === "1";

  if (!picking) {
    const last = (await cookies()).get(LAST_DESTINATION_COOKIE)?.value;
    const remembered = enterable.find((d) => d.href === last);
    if (remembered) redirect(remembered.href);
    if (enterable.length === 1 && destinations.length === 1) redirect(enterable[0].href);
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 py-6">
      <PageHeader
        title={strings.home.welcome(profile?.full_name ?? "")}
        subtitle={destinations.length ? strings.home.pickService : undefined}
      />
      {destinations.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            {strings.home.noMemberships}
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {destinations.map((d) => (
            <li key={d.href}>
              <form action={chooseDestination}>
                <input type="hidden" name="href" value={d.href} />
                <button
                  type="submit"
                  disabled={d.disabled}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border bg-card px-4 py-4 text-start shadow-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">{d.title}</span>
                    <span className="block text-sm text-muted-foreground">{d.subtitle}</span>
                  </span>
                  {!d.disabled && <ChevronLeft className="size-5 shrink-0 text-muted-foreground" />}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <Button asChild variant={destinations.length ? "outline" : "default"} size="lg">
        <Link href="/join">
          <QrCode />
          {strings.home.joinService}
        </Link>
      </Button>
    </main>
  );
}
