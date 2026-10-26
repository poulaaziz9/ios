import "server-only";

import { createClient } from "@/lib/supabase/server";

type Bucket = "avatars" | "service-media";

/**
 * Signed URLs for private storage objects (paths as stored in the DB).
 * Returns a map path → URL; missing or unreadable paths are left out.
 */
export async function signedUrls(bucket: Bucket, paths: (string | null | undefined)[]) {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  const out = new Map<string, string>();
  if (!unique.length) return out;
  const supabase = await createClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrls(unique, 60 * 60);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) out.set(item.path, item.signedUrl);
  }
  return out;
}
