import { notFound } from "next/navigation";

import { BottomNav } from "@/components/bottom-nav";
import { PageHeader } from "@/components/page-header";
import { requireServiceArea } from "@/lib/auth/session";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

const t = strings.served.tabs;

export default async function ServedLayout({ children, params }: LayoutProps<"/s/[serviceId]/home">) {
  const { serviceId } = await params;
  await requireServiceArea(serviceId, "home");
  const supabase = await createClient();
  const { data: service } = await supabase
    .from("services")
    .select("name")
    .eq("id", serviceId)
    .maybeSingle();
  if (!service) notFound();

  const base = `/s/${serviceId}/home`;
  return (
    <>
      <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-5 px-4 pt-6 pb-28">
        <PageHeader title={service.name} />
        {children}
      </main>
      <BottomNav
        items={[
          { href: base, label: t.home, icon: "home", exact: true },
          { href: `${base}/meetings`, label: t.meetings, icon: "calendar" },
          { href: `${base}/competitions`, label: t.competitions, icon: "trophy" },
          { href: `${base}/progress`, label: t.progress, icon: "award" },
        ]}
      />
    </>
  );
}
