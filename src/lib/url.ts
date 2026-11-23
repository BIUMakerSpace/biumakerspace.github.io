/**
 * Returns `value` only if it is an absolute http(s) URL, so user-supplied links
 * can't become `javascript:` hrefs. Returns undefined otherwise.
 */
export function safeUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}
