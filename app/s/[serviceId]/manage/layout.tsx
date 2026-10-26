import { notFound } from "next/navigation";

import { NavTabs } from "@/components/nav-tabs";
import { PageHeader } from "@/components/page-header";
import { requireServiceArea } from "@/lib/auth/session";
import { pendingGiftRequests } from "@/lib/gift-requests";
import { areaSections, withRequestsBadge } from "@/lib/nav";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

const t = strings.manage;

export default async function ManageLayout({
  children,
  params,
}: LayoutProps<"/s/[serviceId]/manage">) {
  const { serviceId } = await params;
  await requireServiceArea(serviceId, "manage");

  const supabase = await createClient();
  const { data: service } = await supabase
    .from("services")
    .select("name")
    .eq("id", serviceId)
    .maybeSingle();
  if (!service) notFound();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-5 px-4 py-6">
      <PageHeader title={service.name} subtitle={t.subtitle} />
      <NavTabs
        tabs={withRequestsBadge(areaSections("manage", serviceId), serviceId, await pendingGiftRequests(serviceId))}
      />
      {children}
    </main>
  );
}
