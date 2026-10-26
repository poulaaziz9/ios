export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Supabase calls this the "publishable" key (older projects and the Vercel
// integration call it the "anon" key); either name works.
export const SUPABASE_PUBLISHABLE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;
