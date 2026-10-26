// Users sign in with either an email or a phone number + password.
// Phone-only accounts are stored in Supabase Auth under a synthetic email
// derived from the normalized phone, so no SMS provider is needed.
// (Requires "Confirm email" to be OFF in the Supabase project.)

const PHONE_EMAIL_DOMAIN = "phone.khedma.app";

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function toLatinDigits(input: string) {
  return input.replace(/[٠-٩۰-۹]/g, (d) => {
    const i = ARABIC_DIGITS.indexOf(d);
    return String(i >= 0 ? i : PERSIAN_DIGITS.indexOf(d));
  });
}

/**
 * Normalize an Egyptian mobile number to E.164 (+20XXXXXXXXXX).
 * Accepts 01XXXXXXXXX, 1XXXXXXXXX, 201XXXXXXXXX, +201XXXXXXXXX, 00201...,
 * with spaces/dashes and Arabic-Indic digits. Returns null if invalid.
 */
export function normalizePhone(raw: string): string | null {
  let digits = toLatinDigits(raw).replace(/[\s\-()]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  if (!/^\d+$/.test(digits)) return null;

  if (digits.startsWith("20")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);

  // Egyptian mobiles: 10, 11, 12, 15 + 8 digits.
  if (!/^1[0125]\d{8}$/.test(digits)) return null;
  return `+20${digits}`;
}

export function isEmail(raw: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

export function phoneToAuthEmail(e164: string) {
  return `${e164.replace("+", "")}@${PHONE_EMAIL_DOMAIN}`;
}

export type ResolvedIdentifier =
  | { kind: "email"; authEmail: string; phone: null }
  | { kind: "phone"; authEmail: string; phone: string };

/** Turn what the user typed into the email Supabase Auth knows them by. */
export function resolveIdentifier(raw: string): ResolvedIdentifier | null {
  const value = raw.trim();
  if (isEmail(value)) {
    return { kind: "email", authEmail: value.toLowerCase(), phone: null };
  }
  const phone = normalizePhone(value);
  if (!phone) return null;
  return { kind: "phone", authEmail: phoneToAuthEmail(phone), phone };
}

/** Display an E.164 Egyptian number the way people write it: +201012345678 → 01012345678. */
export function formatPhone(e164: string | null | undefined) {
  if (!e164) return "";
  return e164.startsWith("+20") ? `0${e164.slice(3)}` : e164;
}
