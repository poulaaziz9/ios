import { Check, X } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const t = strings.competitions;

/** The kid's score and corrected answer sheet for a competition they solved. */
export async function CompetitionReview({ competitionId, score }: { competitionId: string; score: number }) {
  const supabase = await createClient();
  const { data: rows } = await supabase.rpc("my_competition_review", { p_competition: competitionId });
  const sheet = rows ?? [];
  const correct = sheet.filter((r) => r.is_correct).length;
  const revealed = sheet.some((r) => r.correct_index !== null);

  return (
    <>
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-4 text-center">
          <div className="text-2xl font-bold">{t.resultTitle}</div>
          <div className="text-muted-foreground">{t.resultDetail(correct, sheet.length)}</div>
          <div className="text-4xl font-bold text-primary">{t.pointsEarned(score)}</div>
          {score > 0 && <div className="text-sm font-medium text-emerald-600">{t.addedToTotal}</div>}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">{t.review}</h3>
        {!revealed && <p className="text-sm text-muted-foreground">{t.answersLater}</p>}
        {sheet.map((q, qi) => {
          const options = (q.options as string[]) ?? [];
          return (
            <div
              key={q.question_id}
              className={cn(
                "flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm",
                q.is_correct ? "border-emerald-500/40" : "border-destructive/40",
              )}
            >
              <div className="flex items-start gap-2 font-semibold">
                {q.is_correct ? (
                  <Check className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-label="صح" />
                ) : (
                  <X className="mt-0.5 size-5 shrink-0 text-destructive" aria-label="غلط" />
                )}
                <span>
                  <span className="text-muted-foreground">{(qi + 1).toLocaleString("ar-EG")}. </span>
                  {q.question}
                </span>
              </div>
              <ul className="flex flex-col gap-1">
                {options.map((opt, oi) => {
                  const mine = q.my_answer === oi;
                  const right = q.correct_index === oi || (mine && q.is_correct);
                  return (
                    <li
                      key={oi}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
                        right && "border-emerald-500/50 bg-emerald-500/10",
                        mine && !q.is_correct && "border-destructive/50 bg-destructive/10",
                      )}
                    >
                      <span>{opt}</span>
                      <span className="text-xs font-medium">
                        {mine ? t.yourAnswer : right ? t.correctAnswer : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {q.my_answer === null && <p className="text-xs text-muted-foreground">{t.noAnswer}</p>}
            </div>
          );
        })}
      </section>
    </>
  );
}
