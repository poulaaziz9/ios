import { notFound } from "next/navigation";

import { NavTabs } from "@/components/nav-tabs";
import { PageHeader } from "@/components/page-header";
import { requireChurchAdmin } from "@/lib/auth/session";
import { areaBadges } from "@/lib/alerts";
import { areaSections, withBadges } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";

export default async function ChurchLayout({
  children,
  params,
}: LayoutProps<"/church/[churchId]">) {
  const { churchId } = await params;
  await requireChurchAdmin(churchId);

  const supabase = await createClient();
  const { data: church } = await supabase
    .from("churches")
    .select("name, address")
    .eq("id", churchId)
    .maybeSingle();
  if (!church) notFound();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-5 px-4 py-6">
      <PageHeader title={church.name} subtitle={church.address ?? undefined} />
      <NavTabs tabs={withBadges(areaSections("church", churchId), await areaBadges("church", churchId))} />
      {children}
    </main>
  );
}
