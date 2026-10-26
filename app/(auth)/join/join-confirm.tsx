"use client";

import { useActionState } from "react";

import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import type { ActionState } from "@/lib/action-result";
import { strings } from "@/lib/strings";
import { joinService } from "./actions";

export function JoinConfirm({ code }: { code: string }) {
  const [state, action] = useActionState<ActionState>(joinService.bind(null, code), {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <SubmitButton size="lg">{strings.join.confirm}</SubmitButton>
      <FormError message={state.error} />
    </form>
  );
}
