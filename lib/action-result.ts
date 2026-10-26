import { strings } from "@/lib/strings";

/** State returned by form Server Actions (used with useActionState). */
export type ActionState = {
  ok?: boolean;
  error?: string;
};

type PgError = { code?: string; message?: string } | null | undefined;

/** Map a Supabase/Postgres error to a user-facing Arabic message. */
export function errorMessage(error: PgError): string {
  switch (error?.code) {
    case "42501": // insufficient_privilege / RLS violation
      return strings.common.notAllowed;
    case "23505": // unique_violation
      return strings.common.alreadyExists;
    default:
      return strings.common.genericError;
  }
}

export function fromError(error: PgError): ActionState {
  return error ? { error: errorMessage(error) } : { ok: true };
}

export function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}
