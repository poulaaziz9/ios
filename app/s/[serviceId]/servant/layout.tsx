import { notFound } from "next/navigation";

import { BottomNav } from "@/components/bottom-nav";
import { PageHeader } from "@/components/page-header";
import { requireServiceArea } from "@/lib/auth/session";
import { areaBadges } from "@/lib/alerts";
import { areaSections, withBadges } from "@/lib/nav";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

export default async function ServantLayout({
  children,
  params,
}: LayoutProps<"/s/[serviceId]/servant">) {
  const { serviceId } = await params;
  await requireServiceArea(serviceId, "servant");
  const supabase = await createClient();
  const { data: service } = await supabase
    .from("services")
    .select("name")
    .eq("id", serviceId)
    .maybeSingle();
  if (!service) notFound();

  return (
    <>
      <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-5 px-4 pt-6 pb-28">
        <PageHeader title={service.name} subtitle={strings.home.roles.servant} />
        {children}
      </main>
      <BottomNav items={withBadges(areaSections("servant", serviceId), await areaBadges("servant", serviceId))} />
    </>
  );
}
