/** Human-readable message from anything thrown (Error, Supabase PostgrestError, string, ...). */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e && typeof e.message === "string") return e.message;
  return String(e);
}

/** Throws the Supabase error if present, otherwise returns the data (null becomes `fallback`). */
export function unwrap<T>(result: { data: T | null; error: unknown }): T;
export function unwrap<T>(result: { data: T | null; error: unknown }, fallback: T): T;
export function unwrap<T>(result: { data: T | null; error: unknown }, fallback?: T): T {
  if (result.error) throw result.error;
  if (result.data === null) {
    if (fallback !== undefined) return fallback;
    throw new Error("No data returned");
  }
  return result.data;
}
