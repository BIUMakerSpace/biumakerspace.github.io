import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { AuthContext, type AuthContextValue } from "@/hooks/useAuth";

async function fetchIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) {
    console.error("Failed to load user role", error);
    return false;
  }
  return data === true;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  // Role is tracked per user id so a late response for a previous user is ignored.
  const [role, setRole] = useState<{ userId: string; isAdmin: boolean } | null>(null);

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION on subscribe, so no separate getSession() call is needed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setSessionLoaded(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;
  const userId = user?.id ?? null;

  // Re-check the role only when the signed-in user changes, not on every token refresh.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchIsAdmin(userId).then((isAdmin) => {
      if (!cancelled) setRole({ userId, isAdmin });
    });
    return () => { cancelled = true; };
  }, [userId]);

  const roleKnown = !userId || role?.userId === userId;
  const isAdmin = !!userId && role?.userId === userId && role.isAdmin;

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Sign-out failed", error);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, session, loading: !sessionLoaded || !roleKnown, isAdmin, signOut }),
    [user, session, sessionLoaded, roleKnown, isAdmin, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
