// The hosted project. Both values are public by design (they ship to the
// browser), so they live here as the default for deployed builds.
const HOSTED_URL = "https://deoxqsutaevjazglxmeb.supabase.co";
const HOSTED_PUBLISHABLE_KEY = "sb_publishable_Si2nUEM22GTf7uno7uh24w_2krdguN_";

// Vercel builds always talk to the hosted project, so a mistyped dashboard
// variable can't break the deployed app. Elsewhere (local dev, CI) the env
// variables win. Supabase calls the key "publishable" (older projects and the
// Vercel integration call it the "anon" key); either name works.
const onVercel = process.env.ON_VERCEL === "1";

export const SUPABASE_URL = onVercel
  ? HOSTED_URL
  : process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || HOSTED_URL;

export const SUPABASE_PUBLISHABLE_KEY = onVercel
  ? HOSTED_PUBLISHABLE_KEY
  : (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim() ||
    HOSTED_PUBLISHABLE_KEY;
