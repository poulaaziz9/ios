"use client";

import { useActionState, type ReactNode } from "react";

import { FormError } from "@/components/form-error";
import type { ActionState } from "@/lib/action-result";

/** A <form> bound to a Server Action that returns ActionState. Shows errors inline. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {children}
      <FormError message={state.error} />
    </form>
  );
}
