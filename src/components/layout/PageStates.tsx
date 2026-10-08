import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const PageLoading = () => (
  <p className="py-16 text-center text-sm text-muted-foreground" role="status">טוען...</p>
);

/** Bordered placeholder card for empty lists, errors and not-found states. */
export const EmptyState = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <p className={`rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground ${className}`}>
    {children}
  </p>
);

export const NotFoundState = ({ message, backTo, backLabel }: { message: string; backTo: string; backLabel: string }) => (
  <div className="space-y-4 text-center">
    <EmptyState>{message}</EmptyState>
    <Button asChild variant="outline">
      <Link to={backTo}>{backLabel}</Link>
    </Button>
  </div>
);
