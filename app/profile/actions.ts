"use server";

import { revalidatePath } from "next/cache";

import { fromError, text, type ActionState } from "@/lib/action-result";
import { requireUserId } from "@/lib/auth/session";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { imageFromForm, uploadImage } from "@/lib/upload";

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const fullName = text(formData, "full_name");
  if (!fullName) return { error: strings.auth.errors.nameRequired };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .maybeSingle();

  let avatarUrl = current?.avatar_url ?? null;
  const photo = imageFromForm(formData, "avatar");
  if (photo) {
    const uploaded = await uploadImage(supabase, "avatars", userId, photo);
    if (!uploaded.path) return { error: strings.profile.photoError };
    avatarUrl = uploaded.path;
  } else if (formData.get("remove_avatar") === "1") {
    avatarUrl = null;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, avatar_url: avatarUrl })
    .eq("id", userId);
  if (!error && current?.avatar_url && current.avatar_url !== avatarUrl) {
    await supabase.storage.from("avatars").remove([current.avatar_url]);
  }
  revalidatePath("/", "layout");
  return fromError(error);
}
