/**
 * Returns `candidate` if it is a same-origin in-app path, otherwise `fallback`.
 * Rejects protocol-relative ("//evil.com") and backslash ("/\evil.com") tricks.
 */
export function safeRedirectPath(candidate: string | null | undefined, fallback: string): string {
  if (!candidate || !candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return fallback;
  return candidate;
}
