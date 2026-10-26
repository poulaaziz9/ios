"use client";

import { useActionState, useId, useState, type ReactNode } from "react";

import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/action-result";
import { lookupUserByPhone, type LookupState } from "@/lib/actions/users";
import { strings } from "@/lib/strings";

/**
 * Two steps: find a user by exact phone, then confirm `action` for them.
 * `action` receives the found user's id as the `user_id` form field, plus any
 * fields rendered in `extra` (e.g. service checkboxes).
 */
export function UserLookup({
  action,
  submitLabel,
  extra,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  extra?: ReactNode;
}) {
  const [lookup, lookupAction, looking] = useActionState<LookupState, FormData>(
    lookupUserByPhone,
    {},
  );
  const [result, submitAction] = useActionState(action, {});
  const inputId = useId();
  // A lookup result is "dismissed" after cancel or a successful submit,
  // which returns the component to the empty search step.
  const [dismissed, setDismissed] = useState<LookupState | null>(null);
  const [lastResult, setLastResult] = useState(result);
  if (result !== lastResult) {
    setLastResult(result);
    if (result.ok) setDismissed(lookup);
  }
  const user = lookup !== dismissed ? lookup.user : undefined;

  if (!user) {
    return (
      <form action={lookupAction} className="flex flex-col gap-2">
        <Label htmlFor={inputId}>{strings.lookup.phoneLabel}</Label>
        <div className="flex gap-2">
          <Input
            id={inputId}
            name="phone"
            type="tel"
            dir="ltr"
            inputMode="tel"
            placeholder={strings.auth.identifierPlaceholder}
            required
          />
          <Button type="submit" variant="secondary" disabled={looking}>
            {looking ? strings.common.loading : strings.lookup.find}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{strings.lookup.hint}</p>
        <FormError message={lookup.error} />
      </form>
    );
  }

  return (
    <form action={submitAction} className="flex flex-col gap-3">
      <input type="hidden" name="user_id" value={user.id} />
      <p className="text-sm">
        {strings.lookup.found} <span className="font-semibold">{user.full_name}</span>
      </p>
      {extra}
      <div className="flex gap-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Button type="button" variant="ghost" onClick={() => setDismissed(lookup)}>
          {strings.common.cancel}
        </Button>
      </div>
      <FormError message={result.error} />
    </form>
  );
}
