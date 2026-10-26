"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fromError, text, type ActionState } from "@/lib/action-result";
import type { Database } from "@/lib/database.types";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

// Authorization is enforced in Postgres (RLS + RPC checks on is_service_admin).

type MemberStatus = Database["public"]["Enums"]["member_status"];

const managePath = (serviceId: string) => `/s/${serviceId}/manage`;
const revalidate = (serviceId: string) => revalidatePath(managePath(serviceId), "layout");

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------
export async function createClass(
  serviceId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = text(formData, "name");
  if (!name) return { error: strings.common.nameRequired };
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("classes")
    .select("sort_order")
    .eq("service_id", serviceId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase
    .from("classes")
    .insert({ service_id: serviceId, name, sort_order: (last?.sort_order ?? 0) + 1 });
  revalidate(serviceId);
  return fromError(error);
}

export async function updateClass(
  serviceId: string,
  classId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = text(formData, "name");
  if (!name) return { error: strings.common.nameRequired };
  const sortOrder = Number.parseInt(text(formData, "sort_order"), 10);
  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .update({ name, ...(Number.isFinite(sortOrder) ? { sort_order: sortOrder } : {}) })
    .eq("id", classId)
    .eq("service_id", serviceId);
  revalidate(serviceId);
  return fromError(error);
}

export async function deleteClass(serviceId: string, classId: string) {
  const supabase = await createClient();
  await supabase.from("classes").delete().eq("id", classId).eq("service_id", serviceId);
  revalidate(serviceId);
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------
export async function moveMember(serviceId: string, memberId: string, formData: FormData) {
  const classId = text(formData, "class_id") || null;
  const supabase = await createClient();
  await supabase
    .from("service_members")
    .update({ class_id: classId })
    .eq("id", memberId)
    .eq("service_id", serviceId);
  revalidate(serviceId);
}

/** Approve a pending member into a class. */
export async function approveMember(serviceId: string, memberId: string, formData: FormData) {
  const classId = text(formData, "class_id") || null;
  const supabase = await createClient();
  await supabase
    .from("service_members")
    .update({ status: "active", class_id: classId })
    .eq("id", memberId)
    .eq("service_id", serviceId);
  revalidate(serviceId);
}

/** Remove (status "removed", history kept) or restore a served member. */
export async function setMemberStatus(serviceId: string, memberId: string, status: MemberStatus) {
  const supabase = await createClient();
  await supabase
    .from("service_members")
    .update({ status })
    .eq("id", memberId)
    .eq("service_id", serviceId)
    .eq("role", "served");
  revalidate(serviceId);
}

// ---------------------------------------------------------------------------
// Join codes (one per class)
// ---------------------------------------------------------------------------
export async function createCode(
  serviceId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const classId = text(formData, "class_id");
  if (!classId) return { error: strings.common.genericError };
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_join_code", {
    p_class: classId,
    p_expires_on: text(formData, "expires_on") || undefined,
  });
  revalidate(serviceId);
  return fromError(error);
}

export async function setCodeActive(serviceId: string, codeId: string, active: boolean) {
  const supabase = await createClient();
  await supabase.from("join_codes").update({ is_active: active }).eq("id", codeId);
  revalidate(serviceId);
}

export async function regenerateCode(serviceId: string, codeId: string) {
  const supabase = await createClient();
  await supabase.rpc("regenerate_join_code", { p_code_id: codeId });
  revalidate(serviceId);
}

export async function setCodeExpiry(
  serviceId: string,
  codeId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_join_code_expiry", {
    p_code_id: codeId,
    // Empty date clears the expiry.
    p_expires_on: (text(formData, "expires_on") || null) as string,
  });
  revalidate(serviceId);
  return fromError(error);
}

export async function deleteCode(serviceId: string, codeId: string) {
  const supabase = await createClient();
  await supabase.from("join_codes").delete().eq("id", codeId);
  revalidate(serviceId);
}

// ---------------------------------------------------------------------------
// Points
// ---------------------------------------------------------------------------
export async function awardPoints(
  serviceId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const users = formData.getAll("user_id").map(String);
  const points = Number.parseInt(text(formData, "points"), 10);
  const reason = text(formData, "reason") === "attendance" ? "attendance" : "manual";
  if (!users.length) return { error: strings.points.noneSelected };
  if (!Number.isFinite(points) || points === 0) return { error: strings.points.zeroPoints };
  const supabase = await createClient();
  const { error } = await supabase.rpc("award_points_many", {
    p_service: serviceId,
    p_users: users,
    p_points: points,
    p_reason: reason,
    p_note: text(formData, "note") || undefined,
  });
  revalidate(serviceId);
  return fromError(error);
}

export async function reversePoints(serviceId: string, entryId: string) {
  const supabase = await createClient();
  await supabase.rpc("reverse_points", { p_entry: entryId });
  revalidate(serviceId);
}

const RULE_REASONS = ["visit", "preparation", "achievement"] as const;
export type RuleReason = (typeof RULE_REASONS)[number];

export async function saveRules(
  serviceId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const rows = RULE_REASONS.map((reason) => ({
    service_id: serviceId,
    reason,
    points: Math.max(0, Number.parseInt(text(formData, reason), 10) || 0),
  }));
  const supabase = await createClient();
  const { error } = await supabase.from("point_rules").upsert(rows, { onConflict: "service_id,reason" });
  revalidate(serviceId);
  return error ? fromError(error) : { ok: true };
}

// ---------------------------------------------------------------------------
// Visitation (افتقاد)
// ---------------------------------------------------------------------------
/** Assign a served kid to a servant ("" = unassign). */
export async function assignServant(serviceId: string, servedId: string, formData: FormData) {
  const servantId = text(formData, "servant_id");
  const supabase = await createClient();
  if (servantId) {
    await supabase
      .from("servant_assignments")
      .upsert(
        { service_id: serviceId, served_id: servedId, servant_id: servantId },
        { onConflict: "service_id,served_id" },
      );
  } else {
    await supabase.from("servant_assignments").delete().eq("service_id", serviceId).eq("served_id", servedId);
  }
  revalidate(serviceId);
}

/** Delete a wrong visit (its points are reversed by a DB trigger). */
export async function deleteVisit(serviceId: string, visitId: string) {
  const supabase = await createClient();
  await supabase.from("visits").delete().eq("id", visitId).eq("service_id", serviceId);
  revalidate(serviceId);
}

// ---------------------------------------------------------------------------
// Preparation (تحضير)
// ---------------------------------------------------------------------------
export async function createSession(
  serviceId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const title = text(formData, "title");
  const date = text(formData, "session_date");
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: strings.common.nameRequired };
  const supabase = await createClient();
  const { error } = await supabase
    .from("prep_sessions")
    .insert({ service_id: serviceId, title, session_date: date });
  revalidate(serviceId);
  return fromError(error);
}

export async function deleteSession(serviceId: string, sessionId: string) {
  const supabase = await createClient();
  await supabase.from("prep_sessions").delete().eq("id", sessionId).eq("service_id", serviceId);
  revalidate(serviceId);
  redirect(`/s/${serviceId}/manage/prep`);
}

export async function markAttendance(
  serviceId: string,
  sessionId: string,
  servantId: string,
  present: boolean,
) {
  const supabase = await createClient();
  await supabase.rpc("mark_prep_attendance", {
    p_session: sessionId,
    p_servant: servantId,
    p_present: present,
  });
  revalidate(serviceId);
}
