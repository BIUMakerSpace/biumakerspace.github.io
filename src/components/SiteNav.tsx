import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, Menu, X } from "lucide-react";
import logo from "@/assets/biu-cs-logo.png";

const SiteNav = () => {
  const { user, isAdmin, signOut } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/", label: "בית" },
    { to: "/catalog", label: "קטלוג" },
    { to: "/requests", label: "הדפסה" },
    { to: "/community", label: "קהילה" },
    ...(user ? [{ to: "/my-requests", label: "הבקשות שלי" }] : []),
    ...(isAdmin ? [{ to: "/admin", label: "ניהול" }] : []),
  ];

  const closeMenu = () => setOpen(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md" dir="rtl">
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-black text-gradient" onClick={closeMenu}>
          <img src={logo} alt="BIU-CS Maker Space" className="h-8 w-8 object-contain" />
          BIU-CS Maker Space
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 md:flex">
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

        {/* Mobile toggle */}
        <button
          aria-label="תפריט"
          className="rounded-md p-2 text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border bg-background/95 backdrop-blur-md md:hidden">
          <div className="container mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={closeMenu}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === l.to ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            ))}

            {user ? (
              <Button variant="ghost" size="sm" onClick={() => { closeMenu(); signOut(); }} className="mt-2 justify-start gap-1.5">
                <LogOut className="h-4 w-4" />
                יציאה
              </Button>
            ) : (
              <Link to="/auth" onClick={closeMenu} className="mt-2">
                <Button variant="default" size="sm" className="w-full gap-1.5">
                  <UserIcon className="h-4 w-4" />
                  התחברות
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default SiteNav;
