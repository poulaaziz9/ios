"use client";

import { useActionState } from "react";

import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import type { ActionState } from "@/lib/action-result";
import { strings } from "@/lib/strings";

export function CheckInButton({ action }: { action: (prev: ActionState) => Promise<ActionState> }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <SubmitButton size="lg">{strings.servant.checkIn}</SubmitButton>
      <FormError message={state.error} />
    </form>
  );
}
