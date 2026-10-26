"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fromError, text, type ActionState } from "@/lib/action-result";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

// Authorization is enforced by RLS (super admin only); these just shape input.

export async function createChurch(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = text(formData, "name");
  if (!name) return { error: strings.common.nameRequired };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("churches")
    .insert({ name, address: text(formData, "address") || null })
    .select("id")
    .single();
  if (error) return fromError(error);
  redirect(`/admin/churches/${data.id}`);
}

export async function updateChurch(
  churchId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = text(formData, "name");
  if (!name) return { error: strings.common.nameRequired };
  const supabase = await createClient();
  const { error } = await supabase
    .from("churches")
    .update({ name, address: text(formData, "address") || null })
    .eq("id", churchId);
  revalidatePath("/admin", "layout");
  return fromError(error);
}

export async function deleteChurch(churchId: string) {
  const supabase = await createClient();
  await supabase.from("churches").delete().eq("id", churchId);
  revalidatePath("/admin", "layout");
  redirect("/admin");
}

export async function appointChurchAdmin(churchId: string, userId: string) {
  const supabase = await createClient();
  await supabase
    .from("church_roles")
    .upsert(
      { church_id: churchId, user_id: userId, role: "church_admin" },
      { onConflict: "church_id,user_id,role", ignoreDuplicates: true },
    );
  revalidatePath(`/admin/churches/${churchId}`);
}

export async function removeChurchAdmin(churchId: string, userId: string) {
  const supabase = await createClient();
  await supabase
    .from("church_roles")
    .delete()
    .eq("church_id", churchId)
    .eq("user_id", userId)
    .eq("role", "church_admin");
  revalidatePath(`/admin/churches/${churchId}`);
}
