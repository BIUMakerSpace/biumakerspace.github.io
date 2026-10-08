import { supabase } from "@/integrations/supabase/client";

export type Bucket = "catalog-images" | "blog-images" | "stl-files";

// Mirrors the bucket limits set in supabase/migrations/*_hardening.sql.
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];
export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_STL_BYTES = 50 * 1024 * 1024;

/** Returns a Hebrew error message, or null if the file is an acceptable image. */
export function validateImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return "יש לבחור תמונה בפורמט PNG, JPG, WEBP, GIF או AVIF";
  if (file.size > MAX_IMAGE_BYTES) return "התמונה גדולה מדי (מקסימום 5MB)";
  return null;
}

/** Returns a Hebrew error message, or null if the file is an acceptable STL. */
export function validateStl(file: File): string | null {
  if (!/\.stl$/i.test(file.name)) return "יש לצרף קובץ בפורמט STL בלבד";
  if (file.size > MAX_STL_BYTES) return "הקובץ גדול מדי (מקסימום 50MB)";
  return null;
}

/**
 * A collision-free object path that doesn't depend on the original filename
 * (Hebrew/special characters in storage keys break uploads).
 */
export function storagePath(folder: string | null, file: File): string {
  const ext = file.name.match(/\.([a-z0-9]{1,10})$/i)?.[1]?.toLowerCase();
  const name = `${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
  return folder ? `${folder}/${name}` : name;
}

export async function uploadFile(bucket: Bucket, path: string, file: File): Promise<void> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    // Without an explicit type storage-js falls back to text/plain for unknown types.
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;
}

/** Uploads to a public bucket and returns the object's public URL. */
export async function uploadPublicImage(bucket: "catalog-images" | "blog-images", folder: string | null, file: File) {
  const path = storagePath(folder, file);
  await uploadFile(bucket, path, file);
  return { path, publicUrl: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl };
}

/** Best-effort delete; storage cleanup failures shouldn't fail the user's action. */
export async function removeFiles(bucket: Bucket, paths: (string | null | undefined)[]): Promise<void> {
  const valid = paths.filter((p): p is string => !!p);
  if (!valid.length) return;
  const { error } = await supabase.storage.from(bucket).remove(valid);
  if (error) console.warn(`Failed to remove ${valid.join(", ")} from ${bucket}`, error);
}

/** Object path inside `bucket` for one of our public URLs, or null for external URLs. */
export function publicUrlToPath(bucket: Bucket, url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}
