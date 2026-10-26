import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { CompetitionFields } from "@/components/competition-fields";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { competitionStatus } from "@/lib/competitions";
import { formatDateTime } from "@/lib/format";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { saveCompetition } from "../actions";

const t = strings.competitions;

export default async function ManageCompetitionsPage({
  params,
}: PageProps<"/s/[serviceId]/manage/competitions">) {
  const { serviceId } = await params;
  const supabase = await createClient();
  const [{ data: comps }, { data: classes }] = await Promise.all([
    supabase
      .from("competitions")
      .select(
        "id, title, is_published, starts_at, ends_at, classes(name), competition_questions(id), competition_entries(count)",
      )
      .eq("service_id", serviceId)
      .order("created_at", { ascending: false }),
    supabase.from("classes").select("id, name").eq("service_id", serviceId).order("sort_order"),
  ]);

  return (
    <>
      {!comps?.length ? (
        <p className="text-sm text-muted-foreground">{t.none}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {comps.map((c) => {
            const status = competitionStatus(c);
            return (
              <li key={c.id}>
                <Link
                  href={`/s/${serviceId}/manage/competitions/${c.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm hover:bg-accent"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-semibold">
                      {c.title}
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {[
                        c.classes?.name ?? t.wholeService,
                        t.questions(c.competition_questions.length),
                        t.entries(c.competition_entries[0]?.count ?? 0),
                        c.starts_at && formatDateTime(c.starts_at),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <ChevronLeft className="size-5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.newCompetition}</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={saveCompetition.bind(null, serviceId, null)} className="flex flex-col gap-3">
            <CompetitionFields classes={classes ?? []} />
            <SubmitButton className="self-start">{t.create}</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
    </>
  );
}
