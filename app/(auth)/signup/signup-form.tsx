"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/form-error";
import { ImageInput } from "@/components/image-input";
import { NativeSelect } from "@/components/ui/native-select";
import { strings } from "@/lib/strings";
import { signup, type AuthFormState } from "../actions";

const t = strings.auth;

export function SignupForm({
  next,
  churches,
}: {
  next: string;
  churches: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    signup,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <ImageInput name="avatar" label={t.photoOptional} maxSize={512} round />
      <div className="flex flex-col gap-2">
        <Label htmlFor="full_name">{t.fullName}</Label>
        <Input
          id="full_name"
          name="full_name"
          autoComplete="name"
          placeholder={t.fullNamePlaceholder}
          defaultValue={state.fields?.full_name}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">{t.phone}</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          placeholder={t.identifierPlaceholder}
          defaultValue={state.fields?.phone}
          required
        />
      </div>
      {churches.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="church_id">{t.church}</Label>
          <NativeSelect
            id="church_id"
            name="church_id"
            defaultValue={state.fields?.church_id ?? ""}
            required
          >
            <option value="" disabled>
              {t.churchPlaceholder}
            </option>
            {churches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t.password}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          dir="ltr"
          autoComplete="new-password"
          minLength={6}
          required
        />
        <p className="text-xs text-muted-foreground">{t.passwordHint}</p>
      </div>
      <FormError message={state.error} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? strings.common.loading : t.signup}
      </Button>
    </form>
  );
}
