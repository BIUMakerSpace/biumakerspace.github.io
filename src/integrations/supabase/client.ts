import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/config";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // PKCE returns ?code= instead of tokens in the URL hash, which is more robust
    // with the GitHub Pages 404.html fallback.
    flowType: "pkce",
  },
});
