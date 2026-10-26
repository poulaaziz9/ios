"use client";

import { useActionState, type ComponentProps } from "react";

import { SubmitButton } from "@/components/submit-button";
import type { ActionState } from "@/lib/action-result";

/** A one-button form for a bound Server Action, showing its error inline. */
export function ActionButton({
  action,
  ...props
}: Omit<ComponentProps<typeof SubmitButton>, "action"> & {
  action: (prev: ActionState) => Promise<ActionState>;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <SubmitButton {...props} />
      {state.error && <span className="text-xs text-destructive">{state.error}</span>}
    </form>
  );
}
