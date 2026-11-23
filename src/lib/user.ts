import type { User } from "@supabase/supabase-js";

/** Best display name for a signed-in user: profile name from the OAuth provider, else email. */
export function getDisplayName(user: User | null | undefined, fallback = "מייקר"): string {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  for (const key of ["full_name", "name"]) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return user?.email || fallback;
}
