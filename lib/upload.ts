import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** The uploaded image from a form field, or null if none was chosen. */
export function imageFromForm(formData: FormData, key: string): File | null {
  const file = formData.get(key);
  return file instanceof File && file.size > 0 ? file : null;
}

/**
 * Upload an image to `<bucket>/<folder>/<random>.<ext>` and return its path.
 * Storage policies decide whether the caller may write to that folder.
 */
export async function uploadImage(
  supabase: SupabaseClient<Database>,
  bucket: "avatars" | "service-media",
  folder: string,
  file: File,
): Promise<{ path?: string; error?: string }> {
  if (!IMAGE_TYPES.includes(file.type)) return { error: "type" };
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
  return error ? { error: error.message } : { path };
}
