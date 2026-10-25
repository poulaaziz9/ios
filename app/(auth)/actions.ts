"use server";

import { redirect } from "next/navigation";

import { normalizePhone, phoneToAuthEmail, resolveIdentifier } from "@/lib/auth/identifier";
import { safeNextPath } from "@/lib/auth/next-path";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  fields?: Record<string, string>;
};

const t = strings.auth.errors;

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const identifier = String(formData.get("identifier") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));
  const fields = { identifier };

  const resolved = resolveIdentifier(identifier);
  if (!resolved) return { error: t.invalidIdentifier, fields };
  if (!password) return { error: t.badCredentials, fields };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: resolved.authEmail,
    password,
  });
  if (error) return { error: t.badCredentials, fields };

  redirect(next);
}

export async function signup(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const rawPhone = String(formData.get("phone") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));
  const fields = { full_name: fullName, phone: rawPhone };

  if (!fullName) return { error: t.nameRequired, fields };
  const phone = normalizePhone(rawPhone);
  if (!phone) return { error: t.invalidPhone, fields };
  if (password.length < 6) return { error: t.passwordShort, fields };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: phoneToAuthEmail(phone),
    password,
    options: { data: { full_name: fullName, phone } },
  });

  if (error) {
    const taken =
      error.code === "user_already_exists" ||
      error.code === "email_exists" ||
      /already|exists|duplicate/i.test(error.message);
    return { error: taken ? t.alreadyRegistered : strings.common.genericError, fields };
  }
  // With email confirmation on, Supabase returns no session and hides
  // duplicate accounts behind an empty identities list.
  if (!data.session) return { error: t.alreadyRegistered, fields };

  redirect(next);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
