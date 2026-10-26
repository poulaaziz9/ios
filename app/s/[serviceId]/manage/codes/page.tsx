import { Download, Printer } from "lucide-react";
import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { expiryDay, formatDate, toCairoDateInput } from "@/lib/format";
import { joinUrl, qrPngDataUrl, qrSvg } from "@/lib/qr";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import {
  createCode,
  deleteCode,
  regenerateCode,
  setCodeActive,
  setCodeExpiry,
} from "../actions";

const t = strings.manage;

const isPast = (ts: string | null) => ts !== null && new Date(ts).getTime() <= Date.now();

export default async function ManageCodesPage({
  params,
}: PageProps<"/s/[serviceId]/manage/codes">) {
  const { serviceId } = await params;
  const supabase = await createClient();
  const [{ data: classes }, { data: codes }] = await Promise.all([
    supabase.from("classes").select("id, name").eq("service_id", serviceId).order("sort_order"),
    supabase
      .from("join_codes")
      .select("id, code, class_id, is_active, expires_at, created_at")
      .eq("service_id", serviceId)
      .order("created_at", { ascending: false }),
  ]);

  const className = new Map((classes ?? []).map((c) => [c.id, c.name]));
  const rendered = await Promise.all(
    (codes ?? []).map(async (c) => {
      const url = await joinUrl(c.code);
      return { ...c, url, svg: await qrSvg(url), png: await qrPngDataUrl(url) };
    }),
  );

  return (
    <>
      <p className="text-sm text-muted-foreground">{t.codesHint}</p>

      {classes?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{t.newCode}</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={createCode.bind(null, serviceId)} className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="class_id">{t.forClass}</Label>
                  <NativeSelect id="class_id" name="class_id" required defaultValue="">
                    <option value="" disabled>
                      —
                    </option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="expires_on">{t.expiresOn}</Label>
                  <Input id="expires_on" name="expires_on" type="date" />
                </div>
              </div>
              <SubmitButton className="self-start">{t.createCode}</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">{t.noClasses}</p>
      )}

      {!rendered.length ? (
        <p className="text-sm text-muted-foreground">{t.noCodes}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rendered.map((c) => {
            const expired = isPast(c.expires_at);
            const working = c.is_active && !expired;
            return (
              <li key={c.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex gap-4">
                  <div
                    role="img"
                    aria-label={`QR ${className.get(c.class_id) ?? ""}`}
                    className={`size-28 shrink-0 rounded-md border bg-white p-1 ${working ? "" : "opacity-30"}`}
                    // SVG generated on the server by `qrcode` from our own URL.
                    dangerouslySetInnerHTML={{ __html: c.svg }}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="font-semibold">{className.get(c.class_id)}</div>
                    <div className="font-mono text-2xl font-bold tracking-widest" dir="ltr">
                      {c.code}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant={working ? "default" : "secondary"}>
                        {expired ? t.expired : c.is_active ? t.active : t.inactive}
                      </Badge>
                      {c.expires_at ? t.expires(formatDate(expiryDay(c.expires_at))) : t.noExpiry}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/s/${serviceId}/print/codes/${c.id}`} target="_blank">
                      <Printer />
                      {t.print}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={c.png} download={`${className.get(c.class_id) ?? "class"}-${c.code}.png`}>
                      <Download />
                      {t.download}
                    </a>
                  </Button>
                  <form action={setCodeActive.bind(null, serviceId, c.id, !c.is_active)}>
                    <SubmitButton variant="outline" size="sm">
                      {c.is_active ? t.deactivate : t.activate}
                    </SubmitButton>
                  </form>
                  <form action={regenerateCode.bind(null, serviceId, c.id)}>
                    <SubmitButton variant="outline" size="sm" confirm={t.regenerateConfirm}>
                      {t.regenerate}
                    </SubmitButton>
                  </form>
                </div>

                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-primary">
                    {strings.common.edit}
                  </summary>
                  <div className="mt-3 flex flex-col gap-3">
                    <ActionForm
                      action={setCodeExpiry.bind(null, serviceId, c.id)}
                      className="flex flex-col gap-2"
                    >
                      <Label htmlFor={`exp-${c.id}`}>{t.setExpiry}</Label>
                      <div className="flex gap-2">
                        <Input
                          id={`exp-${c.id}`}
                          name="expires_on"
                          type="date"
                          defaultValue={c.expires_at ? toCairoDateInput(expiryDay(c.expires_at)) : ""}
                        />
                        <SubmitButton variant="secondary">{strings.common.save}</SubmitButton>
                      </div>
                    </ActionForm>
                    <form action={deleteCode.bind(null, serviceId, c.id)}>
                      <SubmitButton variant="destructive" size="sm" confirm={strings.common.confirmDelete}>
                        {t.deleteCode}
                      </SubmitButton>
                    </form>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
