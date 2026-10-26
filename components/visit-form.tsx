"use client";

import { useActionState } from "react";

import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/action-result";
import { strings } from "@/lib/strings";

const t = strings.servant;
const TYPES = ["home", "call", "message", "other"] as const;

export function VisitForm({
  action,
  today,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** yyyy-mm-dd in Cairo; the latest selectable day. */
  today: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-2 text-sm font-medium">{t.visitType}</legend>
        {TYPES.map((type, i) => (
          <label
            key={type}
            className="cursor-pointer rounded-full border px-3 py-1.5 text-sm has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground"
          >
            <input type="radio" name="visit_type" value={type} defaultChecked={i === 0} className="sr-only" />
            {strings.manage.visitTypes[type]}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-col gap-2">
        <Label>{t.visitDate}</Label>
        <Input name="date" type="date" defaultValue={today} max={today} required className="w-44" />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{t.notes}</Label>
        <Textarea name="notes" rows={2} />
      </div>
      <SubmitButton className="self-start">{t.saveVisit}</SubmitButton>
      {state.ok && <p className="text-sm font-medium text-emerald-600">{t.visitSaved}</p>}
      <FormError message={state.error} />
    </form>
  );
}
