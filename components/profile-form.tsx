"use client";

import { useActionState } from "react";

import { updateProfile } from "@/app/profile/actions";
import { FormError } from "@/components/form-error";
import { ImageInput } from "@/components/image-input";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { strings } from "@/lib/strings";

const t = strings.profile;

export function ProfileForm({
  fullName,
  avatarUrl,
  churchId,
  churches,
  accountKind,
}: {
  fullName: string;
  avatarUrl?: string | null;
  churchId: string | null;
  churches: { id: string; name: string }[];
  accountKind: "servant" | "served" | null;
}) {
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
      <div className="flex flex-col gap-2">
        <Label htmlFor="account_kind">{t.accountKind}</Label>
        <NativeSelect id="account_kind" name="account_kind" defaultValue={accountKind ?? ""}>
          {!accountKind && <option value="">{t.noChurch}</option>}
          <option value="servant">{strings.auth.kindServant}</option>
          <option value="served">{strings.auth.kindServed}</option>
        </NativeSelect>
      </div>
      {churches.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="church_id">{t.church}</Label>
          <NativeSelect id="church_id" name="church_id" defaultValue={churchId ?? ""}>
            <option value="">{t.noChurch}</option>
            {churches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
      <SubmitButton className="self-start">{t.save}</SubmitButton>
      {state.ok && <p className="text-sm font-medium text-emerald-600">{t.saved}</p>}
      <FormError message={state.error} />
    </form>
  );
}
