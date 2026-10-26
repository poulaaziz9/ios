import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { UserLookup } from "@/components/user-lookup";
import { isUuid } from "@/lib/auth/session";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import {
  appointServiceAdmin,
  deleteService,
  removeServiceAdmin,
  updateService,
} from "../../actions";

const t = strings.church;

export default async function ChurchServicePage({
  params,
}: PageProps<"/church/[churchId]/services/[serviceId]">) {
  const { churchId, serviceId } = await params;
  if (!isUuid(serviceId)) notFound();

  const supabase = await createClient();
  const [{ data: service }, { data: admins }, { data: servants }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, description")
      .eq("id", serviceId)
      .eq("church_id", churchId)
      .maybeSingle(),
    supabase
      .from("service_members")
      .select("user_id, profiles(full_name)")
      .eq("service_id", serviceId)
      .eq("role", "service_admin"),
    supabase.rpc("church_servants", { p_church: churchId }),
  ]);
  if (!service) notFound();

  const adminIds = new Set((admins ?? []).map((a) => a.user_id));
  const candidates = (servants ?? []).filter((s) => !adminIds.has(s.user_id));
  const appoint = appointServiceAdmin.bind(null, churchId, serviceId);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/church/${churchId}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="size-4" />
          {t.services}
        </Link>
        <Button asChild variant="outline" size="sm">
          <Link href={`/s/${service.id}/manage`}>{t.openServicePanel}</Link>
        </Button>
      </div>
      <h2 className="text-xl font-bold">{service.name}</h2>

      <Card>
        <CardHeader>
          <CardTitle>{t.serviceAdmins}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!admins?.length ? (
            <p className="text-sm text-muted-foreground">{t.noServiceAdmins}</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {admins.map((a) => (
                <li key={a.user_id} className="flex items-center justify-between gap-3 py-2">
                  <span className="font-medium">{a.profiles?.full_name}</span>
                  <form action={removeServiceAdmin.bind(null, churchId, serviceId, a.user_id)}>
                    <SubmitButton variant="ghost" size="sm" confirm={strings.common.confirmDelete}>
                      {strings.common.remove}
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-3 border-t pt-4">
            <h3 className="font-medium">{t.appointServiceAdmin}</h3>
            {candidates.length > 0 && (
              <ActionForm action={appoint} className="flex flex-col gap-2">
                <Label htmlFor="pick-servant">{t.pickServant}</Label>
                <div className="flex gap-2">
                  <NativeSelect id="pick-servant" name="user_id" required defaultValue="">
                    <option value="" disabled>
                      —
                    </option>
                    {candidates.map((s) => (
                      <option key={s.user_id} value={s.user_id}>
                        {s.full_name}
                      </option>
                    ))}
                  </NativeSelect>
                  <SubmitButton>{strings.admin.appoint}</SubmitButton>
                </div>
              </ActionForm>
            )}
            <p className="text-sm text-muted-foreground">{t.orByPhone}</p>
            <UserLookup action={appoint} submitLabel={strings.admin.appoint} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.serviceDetails}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ActionForm
            action={updateService.bind(null, churchId, serviceId)}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">{t.serviceName}</Label>
              <Input id="name" name="name" defaultValue={service.name} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">{t.description}</Label>
              <Textarea
                id="description"
                name="description"
                rows={2}
                defaultValue={service.description ?? ""}
              />
            </div>
            <SubmitButton className="self-start">{strings.common.save}</SubmitButton>
          </ActionForm>
          <form action={deleteService.bind(null, churchId, serviceId)} className="border-t pt-4">
            <SubmitButton variant="destructive" confirm={t.deleteServiceConfirm}>
              {t.deleteService}
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
