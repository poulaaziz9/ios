"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { ActionState } from "@/lib/action-result";
import { LAST_DESTINATION_COOKIE } from "@/lib/destinations";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

const JOIN_ERRORS = strings.join.errors;

export async function joinService(code: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data: serviceId, error } = await supabase.rpc("join_with_code", { p_code: code });
  if (error || !serviceId) {
    const key = error?.message as keyof typeof JOIN_ERRORS | undefined;
    return { error: (key && JOIN_ERRORS[key]) || strings.common.genericError };
  }

  const home = `/s/${serviceId}/home`;
  (await cookies()).set(LAST_DESTINATION_COOKIE, home, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(home);
}
