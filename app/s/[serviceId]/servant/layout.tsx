import { notFound } from "next/navigation";

import { BottomNav } from "@/components/bottom-nav";
import { PageHeader } from "@/components/page-header";
import { requireServiceArea } from "@/lib/auth/session";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

const t = strings.servant.tabs;

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

  const base = `/s/${serviceId}/servant`;
  return (
    <>
      <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-5 px-4 pt-6 pb-28">
        <PageHeader title={service.name} subtitle={strings.home.roles.servant} />
        {children}
      </main>
      <BottomNav
        items={[
          { href: base, label: t.home, icon: "home", exact: true },
          { href: `${base}/served`, label: t.served, icon: "users" },
          { href: `${base}/prep`, label: t.prep, icon: "calendar" },
          { href: `${base}/board`, label: t.board, icon: "trophy" },
        ]}
      />
    </>
  );
}
