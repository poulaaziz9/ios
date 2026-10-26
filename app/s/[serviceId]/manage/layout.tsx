import { notFound } from "next/navigation";

import { NavTabs } from "@/components/nav-tabs";
import { PageHeader } from "@/components/page-header";
import { requireServiceArea } from "@/lib/auth/session";
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

  const base = `/s/${serviceId}/manage`;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-5 px-4 py-6">
      <PageHeader title={service.name} subtitle={t.subtitle} />
      <NavTabs
        tabs={[
          { href: base, label: t.tabs.dashboard, exact: true },
          { href: `${base}/classes`, label: t.tabs.classes },
          { href: `${base}/members`, label: t.tabs.members },
          { href: `${base}/codes`, label: t.tabs.codes },
          { href: `${base}/points`, label: t.tabs.points },
          { href: `${base}/meetings`, label: t.tabs.meetings },
          { href: `${base}/attendance`, label: t.tabs.attendance },
          { href: `${base}/visits`, label: t.tabs.visits },
          { href: `${base}/prep`, label: t.tabs.prep },
          { href: `${base}/competitions`, label: t.tabs.competitions },
          { href: `${base}/posts`, label: t.tabs.posts },
          { href: `${base}/gifts`, label: t.tabs.gifts },
          { href: `${base}/achievements`, label: t.tabs.achievements },
        ]}
      />
      {children}
    </main>
  );
}
