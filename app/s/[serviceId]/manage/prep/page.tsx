import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cairoNoon, cairoToday, formatDate } from "@/lib/format";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { createSession } from "../actions";

const t = strings.prep;

export default async function ManagePrepPage({ params }: PageProps<"/s/[serviceId]/manage/prep">) {
  const { serviceId } = await params;
  const supabase = await createClient();
  const [{ data: sessions }, { count: servants }] = await Promise.all([
    supabase
      .from("prep_sessions")
      .select("id, title, session_date, prep_attendance(count)")
      .eq("service_id", serviceId)
      .order("session_date", { ascending: false })
      .limit(50),
    supabase
      .from("service_members")
      .select("id", { count: "exact", head: true })
      .eq("service_id", serviceId)
      .eq("role", "servant")
      .eq("status", "active"),
  ]);
  const today = cairoToday();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t.newSession}</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={createSession.bind(null, serviceId)} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">{t.title}</Label>
              <Input id="title" name="title" placeholder={t.titlePlaceholder} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="session_date">{t.date}</Label>
              <Input id="session_date" name="session_date" type="date" defaultValue={today} required className="w-44" />
            </div>
            <SubmitButton className="self-start">{t.create}</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>

      {!sessions?.length ? (
        <p className="text-sm text-muted-foreground">{t.noSessions}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/s/${serviceId}/manage/prep/${s.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm hover:bg-accent"
              >
                <span>
                  <span className="block font-medium">{s.title}</span>
                  <span className="block text-sm text-muted-foreground">
                    {s.session_date === today ? strings.servant.today : formatDate(cairoNoon(s.session_date))}
                    {" · "}
                    {t.attendance(s.prep_attendance[0]?.count ?? 0, servants ?? 0)}
                  </span>
                </span>
                <ChevronLeft className="size-5 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
