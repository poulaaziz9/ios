import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireServiceArea, type ServiceArea } from "@/lib/auth/session";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

const AREA_ROLE = { manage: "service_admin", servant: "servant", home: "served" } as const;

// Temporary landing for service areas until their phases are built.
export async function ServicePlaceholder({ serviceId, area }: { serviceId: string; area: ServiceArea }) {
  await requireServiceArea(serviceId, area);
  const supabase = await createClient();
  const { data: service } = await supabase
    .from("services")
    .select("name")
    .eq("id", serviceId)
    .maybeSingle();
  if (!service) notFound();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-5 px-4 py-6">
      <PageHeader title={service.name} subtitle={strings.home.roles[AREA_ROLE[area]]} />
      <Card>
        <CardContent className="text-sm text-muted-foreground">
          {strings.service.comingSoon}
        </CardContent>
      </Card>
    </main>
  );
}
