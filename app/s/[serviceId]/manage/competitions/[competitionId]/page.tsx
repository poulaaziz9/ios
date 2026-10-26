import { CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { CompetitionFields } from "@/components/competition-fields";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isUuid } from "@/lib/auth/session";
import { competitionStatus } from "@/lib/competitions";
import { formatRelative } from "@/lib/format";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import {
  addQuestion,
  deleteCompetition,
  deleteQuestion,
  saveCompetition,
  setCompetitionPublished,
} from "../../actions";

const t = strings.competitions;

export default async function ManageCompetitionPage({
  params,
}: PageProps<"/s/[serviceId]/manage/competitions/[competitionId]">) {
  const { serviceId, competitionId } = await params;
  if (!isUuid(competitionId)) notFound();
  const supabase = await createClient();
  const [{ data: comp }, { data: classes }, { data: key }, { data: entries }] = await Promise.all([
    supabase
      .from("competitions")
      .select(
        "id, title, description, class_id, starts_at, ends_at, max_points, is_published, competition_questions(id, question, options, points, sort_order)",
      )
      .eq("id", competitionId)
      .eq("service_id", serviceId)
      .maybeSingle(),
    supabase.from("classes").select("id, name").eq("service_id", serviceId).order("sort_order"),
    supabase.rpc("competition_answer_key", { p_competition: competitionId }),
    supabase
      .from("competition_entries")
      .select("user_id, score, submitted_at, profiles(full_name)")
      .eq("competition_id", competitionId)
      .order("score", { ascending: false })
      .order("submitted_at"),
  ]);
  if (!comp) notFound();

  const correct = new Map((key ?? []).map((k) => [k.question_id, k.correct_index]));
  const questions = [...comp.competition_questions].sort((a, b) => a.sort_order - b.sort_order);
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const status = competitionStatus(comp);

  return (
    <>
      <Link
        href={`/s/${serviceId}/manage/competitions`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
        {t.backToList}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">{comp.title}</h2>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <form action={setCompetitionPublished.bind(null, serviceId, comp.id, !comp.is_published)}>
          <SubmitButton size="sm" variant={comp.is_published ? "outline" : "default"} disabled={!questions.length && !comp.is_published}>
            {comp.is_published ? t.unpublish : t.publish}
          </SubmitButton>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t.questionsTitle} ({strings.manage.points(totalPoints)})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {comp.is_published && questions.length > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400">{t.publishedWarning}</p>
          )}
          {!questions.length ? (
            <p className="text-sm text-muted-foreground">{t.noQuestions}</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {questions.map((q, i) => (
                <li key={q.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium">
                      {(i + 1).toLocaleString("ar-EG")}. {q.question}
                      <span className="ms-2 text-xs text-muted-foreground">{strings.manage.points(q.points)}</span>
                    </div>
                    <form action={deleteQuestion.bind(null, serviceId, q.id)}>
                      <SubmitButton variant="ghost" size="sm" confirm={strings.common.confirmDelete}>
                        {t.deleteQuestion}
                      </SubmitButton>
                    </form>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {(q.options as string[]).map((opt, oi) => (
                      <li
                        key={oi}
                        className={cn(
                          "flex items-center gap-2",
                          correct.get(q.id) === oi && "font-semibold text-emerald-700 dark:text-emerald-400",
                        )}
                      >
                        {correct.get(q.id) === oi ? <CheckCircle2 className="size-4" /> : <span className="size-4" />}
                        {opt}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}

          <details className="rounded-lg border p-3" open={!questions.length}>
            <summary className="cursor-pointer font-medium text-primary">{t.addQuestion}</summary>
            <ActionForm action={addQuestion.bind(null, serviceId, comp.id)} className="mt-3 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="question">{t.question}</Label>
                <Input id="question" name="question" required />
              </div>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm text-muted-foreground">{t.correctHint}</legend>
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct"
                      value={i}
                      defaultChecked={i === 0}
                      aria-label={`${t.correctHint}: ${t.option(i + 1)}`}
                      className="size-4 accent-emerald-600"
                    />
                    <Input name={`option_${i}`} placeholder={t.option(i + 1)} required={i < 2} />
                  </div>
                ))}
              </fieldset>
              <div className="flex items-center gap-3">
                <Label htmlFor="q-points">{t.questionPoints}</Label>
                <Input id="q-points" name="points" type="number" min={0} defaultValue={10} dir="ltr" className="w-24" />
              </div>
              <SubmitButton className="self-start">{t.saveQuestion}</SubmitButton>
            </ActionForm>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.results}</CardTitle>
        </CardHeader>
        <CardContent>
          {!entries?.length ? (
            <p className="text-sm text-muted-foreground">{t.noResults}</p>
          ) : (
            <ol className="flex flex-col divide-y">
              {entries.map((e, i) => (
                <li key={e.user_id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <span className="me-2 text-muted-foreground">{(i + 1).toLocaleString("ar-EG")}</span>
                    {e.profiles?.full_name}
                  </span>
                  <span className="text-sm">
                    <span className="font-semibold">{strings.manage.points(e.score)}</span>
                    <span className="ms-2 text-muted-foreground">{formatRelative(e.submitted_at)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.details}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ActionForm action={saveCompetition.bind(null, serviceId, comp.id)} className="flex flex-col gap-3">
            <CompetitionFields classes={classes ?? []} values={comp} />
            <SubmitButton className="self-start">{strings.common.save}</SubmitButton>
          </ActionForm>
          <form action={deleteCompetition.bind(null, serviceId, comp.id)} className="border-t pt-4">
            <SubmitButton variant="destructive" size="sm" confirm={t.deleteCompetitionConfirm}>
              {t.deleteCompetition}
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
