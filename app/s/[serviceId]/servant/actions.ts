"use server";

import { revalidatePath } from "next/cache";

import { fromError, text, type ActionState } from "@/lib/action-result";
import type { Database } from "@/lib/database.types";
import { cairoNoon, cairoToday } from "@/lib/format";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

type VisitType = Database["public"]["Enums"]["visit_type"];
const VISIT_TYPES: VisitType[] = ["home", "call", "message", "other"];

// Permission checks (assigned servant, session day) live in the RPCs.

export async function logVisit(
  serviceId: string,
  servedId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const type = text(formData, "visit_type") as VisitType;
  if (!VISIT_TYPES.includes(type)) return { error: strings.common.genericError };
  const date = text(formData, "date");
  const today = cairoToday();
  const supabase = await createClient();
  const { error } = await supabase.rpc("log_visit", {
    p_service: serviceId,
    p_served: servedId,
    p_type: type,
    p_notes: text(formData, "notes") || undefined,
    // A past day is recorded at noon Cairo time; today uses "now".
    p_visited_at: date && date !== today ? cairoNoon(date) : undefined,
  });
  revalidatePath(`/s/${serviceId}/servant`, "layout");
  return fromError(error);
}

export async function checkIn(serviceId: string, sessionId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("check_in_prep", { p_session: sessionId });
  revalidatePath(`/s/${serviceId}/servant`, "layout");
  if (error?.message === "not_today") return { error: strings.servant.notToday };
  return fromError(error);
}

// Meeting attendance: any servant (or admin) of the service saves who came.
export async function saveAttendance(
  serviceId: string,
  date: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const present = formData.getAll("served").map(String);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_meeting_attendance", {
    p_service: serviceId,
    p_date: date,
    p_present: present,
  });
  revalidatePath(`/s/${serviceId}`, "layout");
  if (error?.message === "future_date") return { error: strings.attendance.futureDate };
  return fromError(error);
}
