"use client";

import { useActionState } from "react";

import { updateProfile } from "@/app/profile/actions";
import { FormError } from "@/components/form-error";
import { ImageInput } from "@/components/image-input";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { strings } from "@/lib/strings";

const t = strings.profile;

export function ProfileForm({ fullName, avatarUrl }: { fullName: string; avatarUrl?: string | null }) {
  const [state, action] = useActionState(updateProfile, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      <ImageInput name="avatar" label={t.choosePhoto} maxSize={512} defaultPreview={avatarUrl} round />
      {avatarUrl && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" name="remove_avatar" value="1" className="size-4 accent-primary" />
          {t.removePhoto}
        </label>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="full_name">{strings.auth.fullName}</Label>
        <Input id="full_name" name="full_name" defaultValue={fullName} required />
      </div>
      <SubmitButton className="self-start">{t.save}</SubmitButton>
      {state.ok && <p className="text-sm font-medium text-emerald-600">{t.saved}</p>}
      <FormError message={state.error} />
    </form>
  );
}
