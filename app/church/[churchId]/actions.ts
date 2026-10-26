"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fromError, text, type ActionState } from "@/lib/action-result";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

// Authorization is enforced in Postgres (RLS + RPC checks). Server actions
// only shape input and revalidate.

const churchPath = (churchId: string) => `/church/${churchId}`;

export async function createService(
  churchId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = text(formData, "name");
  if (!name) return { error: strings.common.nameRequired };
  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .insert({ church_id: churchId, name, description: text(formData, "description") || null });
  revalidatePath(churchPath(churchId), "layout");
  return fromError(error);
}

export async function updateService(
  churchId: string,
  serviceId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = text(formData, "name");
  if (!name) return { error: strings.common.nameRequired };
  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({ name, description: text(formData, "description") || null })
    .eq("id", serviceId);
  revalidatePath(churchPath(churchId), "layout");
  return fromError(error);
}

export async function deleteService(churchId: string, serviceId: string) {
  const supabase = await createClient();
  await supabase.from("services").delete().eq("id", serviceId).eq("church_id", churchId);
  revalidatePath(churchPath(churchId), "layout");
  redirect(churchPath(churchId));
}

export async function appointServiceAdmin(
  churchId: string,
  serviceId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = text(formData, "user_id");
  if (!userId) return { error: strings.common.genericError };
  const supabase = await createClient();
  const { error } = await supabase
    .from("service_members")
    .insert({ service_id: serviceId, user_id: userId, role: "service_admin", status: "active" });
  revalidatePath(churchPath(churchId), "layout");
  return fromError(error);
}

export async function removeServiceAdmin(churchId: string, serviceId: string, userId: string) {
  const supabase = await createClient();
  await supabase
    .from("service_members")
    .delete()
    .eq("service_id", serviceId)
    .eq("user_id", userId)
    .eq("role", "service_admin");
  revalidatePath(churchPath(churchId), "layout");
}

/** Add a servant (from phone lookup) or change which services they serve in. */
export async function setServantServices(
  churchId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = text(formData, "user_id");
  if (!userId) return { error: strings.common.genericError };
  const services = formData.getAll("service_id").map(String);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_servant_services", {
    p_church: churchId,
    p_user: userId,
    p_services: services,
  });
  revalidatePath(churchPath(churchId), "layout");
  return fromError(error);
}

export async function removeServant(churchId: string, userId: string) {
  const supabase = await createClient();
  await supabase.rpc("remove_church_servant", { p_church: churchId, p_user: userId });
  revalidatePath(churchPath(churchId), "layout");
}

// ---------------------------------------------------------------------------
// Complaints & suggestions to the platform
// ---------------------------------------------------------------------------
export async function sendFeedback(churchId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const subject = text(formData, "subject");
  const body = text(formData, "body");
  const kind = text(formData, "kind") === "complaint" ? "complaint" : "suggestion";
  if (!subject || !body) return { error: strings.feedback.required };
  const supabase = await createClient();
  const { error } = await supabase.from("feedback").insert({ church_id: churchId, kind, subject, body });
  revalidatePath(churchPath(churchId), "layout");
  return fromError(error);
}

export async function replyFromChurch(
  churchId: string,
  feedbackId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const body = text(formData, "body");
  if (!body) return { error: strings.feedback.required };
  const supabase = await createClient();
  const { error } = await supabase.from("feedback_replies").insert({ feedback_id: feedbackId, body });
  revalidatePath(churchPath(churchId), "layout");
  return fromError(error);
}
