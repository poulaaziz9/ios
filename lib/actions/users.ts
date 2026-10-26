"use server";

import { errorMessage, text } from "@/lib/action-result";
import { normalizePhone } from "@/lib/auth/identifier";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

export type LookupState = {
  error?: string;
  user?: { id: string; full_name: string };
};

/** Exact phone lookup (church admins and super admins only, enforced in SQL). */
export async function lookupUserByPhone(
  _prev: LookupState,
  formData: FormData,
): Promise<LookupState> {
  const phone = normalizePhone(text(formData, "phone"));
  if (!phone) return { error: strings.auth.errors.invalidPhone };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("find_user_by_phone", { p_phone: phone });
  if (error) return { error: errorMessage(error) };
  const user = data?.[0];
  if (!user) return { error: strings.lookup.notFound };
  return { user };
}
