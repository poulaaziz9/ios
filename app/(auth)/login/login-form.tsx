"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/form-error";
import { strings } from "@/lib/strings";
import { login, type AuthFormState } from "../actions";

const t = strings.auth;

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    login,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="identifier">{t.identifier}</Label>
        <Input
          id="identifier"
          name="identifier"
          dir="ltr"
          inputMode="text"
          autoComplete="username"
          placeholder={t.identifierPlaceholder}
          defaultValue={state.fields?.identifier}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t.password}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          required
        />
      </div>
      <FormError message={state.error} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? strings.common.loading : t.login}
      </Button>
    </form>
  );
}
