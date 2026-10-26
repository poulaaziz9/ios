"use client";

import { useActionState, useState } from "react";

import type { QuizState } from "@/app/s/[serviceId]/home/actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

const t = strings.competitions;

type Question = { id: string; question: string; options: string[]; points: number };

export function QuizForm({
  questions,
  action,
}: {
  questions: Question[];
  action: (prev: QuizState, formData: FormData) => Promise<QuizState>;
}) {
  const [state, formAction] = useActionState(action, {});
  const [answered, setAnswered] = useState<Record<string, number>>({});
  const complete = questions.every((q) => q.id in answered);

  if (state.result) {
    const { score, correct, total } = state.result;
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-4 text-center">
          <div className="text-2xl font-bold">{t.resultTitle}</div>
          <div className="text-muted-foreground">{t.resultDetail(correct, total)}</div>
          <div className="text-4xl font-bold text-primary">{t.pointsEarned(score)}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {questions.map((q, qi) => (
        <fieldset key={q.id} className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm">
          <legend className="sr-only">{q.question}</legend>
          <div className="font-semibold">
            <span className="text-muted-foreground">{(qi + 1).toLocaleString("ar-EG")}. </span>
            {q.question}
          </div>
          {q.options.map((opt, oi) => (
            <label
              key={oi}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                answered[q.id] === oi && "border-primary bg-primary/10 font-medium",
              )}
            >
              <input
                type="radio"
                name={`q:${q.id}`}
                value={oi}
                required
                onChange={() => setAnswered((a) => ({ ...a, [q.id]: oi }))}
                className="size-4 accent-primary"
              />
              {opt}
            </label>
          ))}
        </fieldset>
      ))}
      {!complete && <p className="text-sm text-muted-foreground">{t.answerAll}</p>}
      <SubmitButton size="lg" disabled={!complete} confirm={t.submitConfirm}>
        {t.submit}
      </SubmitButton>
      <FormError message={state.error} />
    </form>
  );
}
