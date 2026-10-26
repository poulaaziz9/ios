import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhone } from "@/lib/auth/identifier";
import { isUuid } from "@/lib/auth/session";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import {
  appointChurchAdmin,
  deleteChurch,
  removeChurchAdmin,
  updateChurch,
} from "../../actions";

const t = strings.admin;

export default async function AdminChurchPage({
  params,
  searchParams,
}: PageProps<"/admin/churches/[churchId]">) {
  const { churchId } = await params;
  if (!isUuid(churchId)) notFound();
  const q = String((await searchParams).q ?? "").trim();

  const supabase = await createClient();
  const [{ data: church }, { data: admins }, results] = await Promise.all([
    supabase.from("churches").select("id, name, address").eq("id", churchId).maybeSingle(),
    supabase.rpc("church_admins", { p_church: churchId }),
    q ? supabase.rpc("search_users", { p_query: q }) : Promise.resolve({ data: null }),
  ]);
  if (!church) notFound();
  const adminIds = new Set((admins ?? []).map((a) => a.user_id));

  return (
    <>
      <PageHeader title={church.name} subtitle={church.address ?? undefined} backHref="/admin">
        <Button asChild variant="outline" size="sm">
          <Link href={`/church/${church.id}`}>{t.openChurchPanel}</Link>
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>{t.churchAdmins}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!admins?.length ? (
            <p className="text-sm text-muted-foreground">{t.noChurchAdmins}</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {admins.map((a) => (
                <li key={a.user_id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block font-medium">{a.full_name}</span>
                    <span className="block text-sm text-muted-foreground" dir="ltr">
                      {formatPhone(a.phone)}
                    </span>
                  </span>
                  <form action={removeChurchAdmin.bind(null, church.id, a.user_id)}>
                    <SubmitButton variant="ghost" size="sm" confirm={strings.common.confirmDelete}>
                      {strings.common.remove}
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2 border-t pt-4">
            <h3 className="font-medium">{t.addChurchAdmin}</h3>
            {/* Plain GET form: results render on the server. */}
            <form className="flex gap-2">
              <Input
                name="q"
                defaultValue={q}
                placeholder={t.searchUsers}
                aria-label={t.searchUsers}
                minLength={2}
              />
              <Button type="submit" variant="secondary">
                {strings.common.search}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground">{t.searchHint}</p>
            {results.data &&
              (results.data.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.noResults}</p>
              ) : (
                <ul className="flex flex-col divide-y">
                  {results.data.map((u) => (
                    <li key={u.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0">
                        <span className="block font-medium">{u.full_name}</span>
                        <span className="block text-sm text-muted-foreground" dir="ltr">
                          {formatPhone(u.phone)}
                        </span>
                      </span>
                      {adminIds.has(u.id) ? (
                        <Badge variant="secondary">{t.alreadyAdmin}</Badge>
                      ) : (
                        <form action={appointChurchAdmin.bind(null, church.id, u.id)}>
                          <SubmitButton size="sm">{t.appoint}</SubmitButton>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.churchDetails}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ActionForm action={updateChurch.bind(null, church.id)} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">{t.churchName}</Label>
              <Input id="name" name="name" defaultValue={church.name} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="address">{t.address}</Label>
              <Input id="address" name="address" defaultValue={church.address ?? ""} />
            </div>
            <SubmitButton className="self-start">{strings.common.save}</SubmitButton>
          </ActionForm>
          <form action={deleteChurch.bind(null, church.id)} className="border-t pt-4">
            <SubmitButton variant="destructive" confirm={t.deleteChurchConfirm}>
              {t.deleteChurch}
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
