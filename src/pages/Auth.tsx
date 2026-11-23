import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import SiteNav from "@/components/SiteNav";
import { BASE_PATH } from "@/config";
import { safeRedirectPath } from "@/lib/redirect";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const safeRedirect = safeRedirectPath(searchParams.get("redirect"), "/requests");

  useEffect(() => {
    if (!loading && user) navigate(safeRedirect, { replace: true });
  }, [user, loading, navigate, safeRedirect]);

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${BASE_PATH}${safeRedirect.slice(1)}` },
    });
    if (error) toast.error("שגיאה בהתחברות", { description: error.message });
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SiteNav />
      <div className="container mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md items-center px-6">
        <div className="w-full rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="mb-2 text-3xl font-black text-foreground">
            <span className="text-gradient">התחברות</span>
          </h1>
          <p className="mb-8 text-sm text-muted-foreground">
            התחברו כדי לשלוח בקשות הדפסה ולהשאיל ציוד מהמייקרספייס
          </p>
          <Button onClick={handleGoogleSignIn} size="lg" className="w-full gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            התחברות עם Google
          </Button>
          {import.meta.env.DEV && <DevEmailLogin />}
        </div>
      </div>
    </div>
  );
};

/**
 * Local-development-only sign-in, so the app can be exercised against
 * `supabase start` without Google OAuth credentials. Never rendered in production builds.
 */
const DevEmailLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const signIn = await supabase.auth.signInWithPassword({ email, password });
    if (!signIn.error) return;
    const signUp = await supabase.auth.signUp({ email, password });
    if (signUp.error) toast.error("Dev login failed", { description: signUp.error.message });
  };

  return (
    <form onSubmit={submit} className="mt-8 space-y-2 border-t border-dashed border-border pt-6 text-start" dir="ltr">
      <p className="text-xs font-mono text-muted-foreground">DEV ONLY: email login (creates the user if missing)</p>
      <Input type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input type="password" placeholder="password (6+ chars)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
      <Button type="submit" variant="outline" size="sm" className="w-full">Sign in</Button>
    </form>
  );
};

export default Auth;
