import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon, Menu, X, ChevronDown, BookOpen, MessagesSquare, MessageCircle } from "lucide-react";

const WHATSAPP_URL = "https://chat.whatsapp.com/CfS0h6wH15CCzIdKOoyQ2z?mode=gi_t";

const SiteNav = () => {
  const { user, isAdmin, signOut } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/", label: "בית" },
    { to: "/catalog", label: "קטלוג" },
    { to: "/requests", label: "הדפסה" },
    ...(user ? [{ to: "/my-requests", label: "הבקשות שלי" }] : []),
    ...(isAdmin ? [{ to: "/admin", label: "ניהול" }] : []),
  ];

  const socialActive = pathname === "/blog" || pathname === "/forum";
  const closeMenu = () => setOpen(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md" dir="rtl">
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link to="/" className="text-lg font-black text-gradient" onClick={closeMenu}>Maker Space</Link>

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

          {/* Community / social dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  socialActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                קהילה
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" dir="rtl" className="min-w-[180px]">
              <DropdownMenuItem asChild>
                <Link to="/blog" className="gap-2">
                  <BookOpen className="h-4 w-4" /> בלוג
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/forum" className="gap-2">
                  <MessagesSquare className="h-4 w-4" /> פורום
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="gap-2">
                  <MessageCircle className="h-4 w-4 text-[#25D366]" /> וואטסאפ
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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

            <div className="mt-2 border-t border-border pt-2">
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">קהילה</p>
              <Link
                to="/blog"
                onClick={closeMenu}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === "/blog" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BookOpen className="h-4 w-4" /> בלוג
              </Link>
              <Link
                to="/forum"
                onClick={closeMenu}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === "/forum" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessagesSquare className="h-4 w-4" /> פורום
              </Link>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <MessageCircle className="h-4 w-4 text-[#25D366]" /> וואטסאפ
              </a>
            </div>

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
