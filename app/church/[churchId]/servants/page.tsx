import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserLookup } from "@/components/user-lookup";
import { formatPhone } from "@/lib/auth/identifier";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { removeServant, setServantServices } from "../actions";

const t = strings.church;

type Service = { id: string; name: string };

function ServiceCheckboxes({ services, checked }: { services: Service[]; checked?: string[] }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">{t.chooseServices}</legend>
      {services.map((s) => (
        <label key={s.id} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="service_id"
            value={s.id}
            defaultChecked={checked?.includes(s.id)}
            className="size-4 accent-primary"
          />
          {s.name}
        </label>
      ))}
    </fieldset>
  );
}

export default async function ChurchServantsPage({
  params,
}: PageProps<"/church/[churchId]/servants">) {
  const { churchId } = await params;
  const supabase = await createClient();
  const [{ data: servants }, { data: services }] = await Promise.all([
    supabase.rpc("church_servants", { p_church: churchId }),
    supabase.from("services").select("id, name").eq("church_id", churchId).order("name"),
  ]);
  const serviceName = new Map((services ?? []).map((s) => [s.id, s.name]));
  const save = setServantServices.bind(null, churchId);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t.addServant}</CardTitle>
        </CardHeader>
        <CardContent>
          <UserLookup
            action={save}
            submitLabel={t.addServant}
            extra={<ServiceCheckboxes services={services ?? []} />}
          />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.servantsPool}</h2>
        {!servants?.length ? (
          <p className="text-sm text-muted-foreground">{t.noServants}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {servants.map((s) => (
              <li key={s.user_id} className="rounded-xl border bg-card px-4 py-3 shadow-sm">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">{s.full_name}</span>
                  {s.phone && (
                    <span className="text-sm text-muted-foreground" dir="ltr">
                      {formatPhone(s.phone)}
                    </span>
                  )}
                  <div className="flex flex-wrap items-center gap-1 text-sm">
                    {s.service_ids.length ? (
                      s.service_ids.map((id) => (
                        <Badge key={id} variant="secondary">
                          {serviceName.get(id)}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">{t.notServingYet}</span>
                    )}
                  </div>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-primary">
                    {strings.common.edit}
                  </summary>
                  <div className="mt-3 flex flex-col gap-4">
                    <ActionForm action={save} className="flex flex-col gap-3">
                      <input type="hidden" name="user_id" value={s.user_id} />
                      <ServiceCheckboxes services={services ?? []} checked={s.service_ids} />
                      <SubmitButton size="sm" className="self-start">
                        {t.saveServices}
                      </SubmitButton>
                    </ActionForm>
                    <form action={removeServant.bind(null, churchId, s.user_id)}>
                      <SubmitButton variant="destructive" size="sm" confirm={t.removeFromChurchConfirm}>
                        {t.removeFromChurch}
                      </SubmitButton>
                    </form>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
