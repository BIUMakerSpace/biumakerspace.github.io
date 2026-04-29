import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon } from "lucide-react";

const SiteNav = () => {
  const { user, isAdmin, signOut } = useAuth();
  const { pathname } = useLocation();

  const links = [
    { to: "/", label: "בית" },
    { to: "/requests", label: "בקשות" },
    ...(isAdmin ? [{ to: "/admin", label: "ניהול" }] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md" dir="rtl">
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="text-lg font-black text-gradient">Maker Space</Link>
        <div className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname === l.to ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user ? (
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5">
              <LogOut className="h-4 w-4" />
              יציאה
            </Button>
          ) : (
            <Link to="/auth">
              <Button variant="default" size="sm" className="gap-1.5">
                <UserIcon className="h-4 w-4" />
                התחברות
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default SiteNav;
