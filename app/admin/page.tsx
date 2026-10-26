import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { createChurch } from "./actions";
import { AdminTabs } from "./admin-tabs";

const t = strings.admin;

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: churches } = await supabase
    .from("churches")
    .select("id, name, address, services(count)")
    .order("name");

  return (
    <>
      <PageHeader title={t.title} />
      <AdminTabs />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t.churches}</h2>
        {!churches?.length ? (
          <p className="text-sm text-muted-foreground">{t.noChurches}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {churches.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/churches/${c.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm hover:bg-accent"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">{c.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {[c.address, t.servicesCount(c.services[0]?.count ?? 0)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <ChevronLeft className="size-5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t.newChurch}</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={createChurch} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">{t.churchName}</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="address">{t.address}</Label>
              <Input id="address" name="address" />
            </div>
            <SubmitButton className="self-start">{t.create}</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
    </>
  );
}
