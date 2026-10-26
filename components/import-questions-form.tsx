"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { useActionState } from "react";

import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/action-result";
import { strings } from "@/lib/strings";

const t = strings.competitions.import;

type State = ActionState & { added?: number };

/** Upload a whole competition's questions from an Excel / CSV file. */
export function ImportQuestionsForm({
  action,
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t.hint}</p>
      <p className="text-sm text-muted-foreground">{t.columns}</p>
      <a
        href="/questions-template.csv"
        download="نموذج-أسئلة.csv"
        className="flex items-center gap-1.5 self-start text-sm font-medium text-primary hover:underline"
      >
        <Download className="size-4" />
        {t.template}
      </a>
      <div className="flex flex-col gap-2">
        <Label htmlFor="questions-file">{t.file}</Label>
        <Input
          id="questions-file"
          name="file"
          type="file"
          required
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        />
      </div>
      <div className="flex items-center gap-3">
        <Label htmlFor="import-points">{t.defaultPoints}</Label>
        <Input id="import-points" name="points" type="number" min={0} defaultValue={10} dir="ltr" className="w-24" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="replace" className="size-4 accent-primary" />
        {t.replace}
      </label>
      <SubmitButton className="self-start">
        <FileSpreadsheet />
        {t.upload}
      </SubmitButton>
      {state.ok && state.added ? (
        <p className="text-sm font-medium text-emerald-600">{t.added(state.added)}</p>
      ) : null}
      <FormError message={state.error} />
    </form>
  );
}
