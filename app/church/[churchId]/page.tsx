import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { createService } from "./actions";

const t = strings.church;

export default async function ChurchServicesPage({ params }: PageProps<"/church/[churchId]">) {
  const { churchId } = await params;
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select(
      "id, name, description, members:service_members(count), admins:service_members(user_id, profiles(full_name))",
    )
    .eq("church_id", churchId)
    .eq("members.status", "active")
    .eq("admins.role", "service_admin")
    .order("name");

  return (
    <>
      <section className="flex flex-col gap-2">
        {!services?.length ? (
          <p className="text-sm text-muted-foreground">{t.noServices}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {services.map((s) => {
              const admins = s.admins.map((a) => a.profiles?.full_name).filter(Boolean);
              return (
                <li key={s.id}>
                  <Link
                    href={`/church/${churchId}/services/${s.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm hover:bg-accent"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold">{s.name}</span>
                      <span className="block text-sm text-muted-foreground">
                        {t.members(s.members[0]?.count ?? 0)}
                        {" · "}
                        {admins.length ? `${t.serviceAdmins}: ${admins.join("، ")}` : t.noServiceAdmins}
                      </span>
                    </span>
                    <ChevronLeft className="size-5 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t.newService}</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={createService.bind(null, churchId)} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">{t.serviceName}</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">{t.description}</Label>
              <Textarea id="description" name="description" rows={2} />
            </div>
            <SubmitButton className="self-start">{t.createService}</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
    </>
  );
}
