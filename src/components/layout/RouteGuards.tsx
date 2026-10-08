import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PageLoading } from "@/components/layout/PageStates";

/** Renders children only for signed-in users; otherwise sends them to sign in and back. */
export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoading />;
  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?redirect=${redirect}`} replace />;
  }
  return <>{children}</>;
};

/** Renders children only for admins. Real enforcement is RLS; this just avoids a broken page. */
export const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const { isAdmin } = useAuth();
  return (
    <RequireAuth>
      {isAdmin ? children : <Navigate to="/" replace />}
    </RequireAuth>
  );
};
