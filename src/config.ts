// Runtime configuration, read once from Vite env vars (see .env.example).

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required env var ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

/** Base path the app is served from, always with a trailing slash ("/" or "/repo-name/"). */
export const BASE_PATH = import.meta.env.BASE_URL;

/**
 * Public URL of the deployed site including the base path, without a trailing slash.
 * Used for links that must survive outside the browser (printed locker QR codes, OAuth redirects).
 * Falls back to the current origin so local development works without setting it.
 */
export const PUBLIC_SITE_URL = (
  import.meta.env.VITE_PUBLIC_SITE_URL || `${window.location.origin}${BASE_PATH}`
).replace(/\/+$/, "");

export const SUPABASE_URL = required("VITE_SUPABASE_URL", import.meta.env.VITE_SUPABASE_URL);
export const SUPABASE_PUBLISHABLE_KEY = required(
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

/** Absolute in-app URL for a router path, e.g. siteUrl("/lockers/3"). */
export function siteUrl(path: string): string {
  return `${PUBLIC_SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** URL of a file in public/, respecting the base path, e.g. publicAsset("tutorials/kit.pdf"). */
export function publicAsset(path: string): string {
  return `${BASE_PATH}${path.replace(/^\/+/, "")}`;
}

/**
 * Last day borrowed equipment must be returned, shown in the lending terms.
 * Update every academic year.
 */
export const LOAN_RETURN_DEADLINE = "1.7.2026";
