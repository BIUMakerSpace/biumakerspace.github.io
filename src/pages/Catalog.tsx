import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SiteNav from "@/components/SiteNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Search, Package, ShoppingBag, SlidersHorizontal, ChevronDown, ChevronUp,
  ShoppingCart, Plus, Minus, Trash2, Info, PackagePlus, Printer,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_TO_GENERAL,
  GENERAL_CATEGORIES,
  GENERAL_CATEGORY_LABELS,
  normalizeCategory,
  normalizeGeneralCategory,
  type CatalogCategory,
  type GeneralCategory,
} from "@/lib/categories";

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  quantity_available: number;
  quantity_total: number;
  category: string;
  general_category: string;
}

const lendSchema = z.object({
  requester_name: z.string().trim().min(2).max(100),
  requester_email: z.string().trim().email().max(255),
  requester_phone: z.string().trim().min(7).max(20),
  notes: z.string().trim().max(1000).optional(),
});

const itemReqSchema = z.object({
  item_name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(1000).optional(),
  reference_link: z.string().trim().url().max(500).optional().or(z.literal("")),
  requester_name: z.string().trim().min(2).max(100),
  requester_email: z.string().trim().email().max(255),
  requester_phone: z.string().trim().min(7).max(20),
});

const Catalog = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [generalCategory, setGeneralCategory] = useState<GeneralCategory | "all">("all");
  const [category, setCategory] = useState<CatalogCategory | "all">("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [details, setDetails] = useState<CatalogItem | null>(null);

  // Cart
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [bumpKey, setBumpKey] = useState(0);
  const autoOpenedRef = useRef(false);

  // Lend form
  const [lName, setLName] = useState("");
  const [lEmail, setLEmail] = useState("");
  const [lPhone, setLPhone] = useState("");
  const [lNotes, setLNotes] = useState("");
  const [lSubmitting, setLSubmitting] = useState(false);

  // "Request new item" dialog
  const [reqOpen, setReqOpen] = useState(false);
  const [riName, setRiName] = useState("");
  const [riDesc, setRiDesc] = useState("");
  const [riLink, setRiLink] = useState("");
  const [riSubmitting, setRiSubmitting] = useState(false);

  useEffect(() => {
    supabase.from("catalog_items").select("*").order("name").then(({ data }) => {
      setItems((data ?? []) as CatalogItem[]);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    setLEmail(user.email ?? "");
    const meta = (user.user_metadata ?? {}) as Record<string, string>;
    const name = meta.full_name || meta.name || "";
    setLName(name);
  }, [user]);

  const itemGeneral = (it: CatalogItem): GeneralCategory => {
    if (it.general_category) return normalizeGeneralCategory(it.general_category);
    return CATEGORY_TO_GENERAL[normalizeCategory(it.category)];
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (generalCategory !== "all" && itemGeneral(it) !== generalCategory) return false;
      if (category !== "all" && normalizeCategory(it.category) !== category) return false;
      if (!q) return true;
      return (
        it.name.toLowerCase().includes(q) ||
        (it.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, category, generalCategory]);

  const generalCounts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const g of GENERAL_CATEGORIES) c[g] = 0;
    for (const it of items) c[itemGeneral(it)]++;
    return c;
  }, [items]);

  const visibleDetailed = useMemo(() => {
    if (generalCategory === "all") return CATEGORIES;
    return CATEGORIES.filter((c) => CATEGORY_TO_GENERAL[c] === generalCategory);
  }, [generalCategory]);

  const detailedCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const cat of CATEGORIES) c[cat] = 0;
    for (const it of items) {
      if (generalCategory !== "all" && itemGeneral(it) !== generalCategory) continue;
      c[normalizeCategory(it.category)]++;
    }
    return c;
  }, [items, generalCategory]);

  // Cart helpers
  const addToCart = (it: CatalogItem) => {
    const current = cart[it.id] ?? 0;
    if (current >= it.quantity_available) {
      toast.error("הגעת לכמות המקסימלית הזמינה");
      return;
    }
    setCart((c) => ({ ...c, [it.id]: current + 1 }));
    setBumpKey((k) => k + 1);
    toast.success(`${it.name} נוסף לעגלה`);
    if (!autoOpenedRef.current) {
      autoOpenedRef.current = true;
      // Briefly open the cart on first add so the user sees where it lives
      setTimeout(() => setCartOpen(true), 250);
    }
  };
  const decFromCart = (id: string) => setCart((c) => {
    const n = { ...c };
    if ((n[id] ?? 0) <= 1) delete n[id];
    else n[id] -= 1;
    return n;
  });
  const incFromCart = (id: string) => {
    const it = items.find((i) => i.id === id);
    if (!it) return;
    const cur = cart[id] ?? 0;
    if (cur >= it.quantity_available) return;
    setCart((c) => ({ ...c, [id]: cur + 1 }));
    setBumpKey((k) => k + 1);
  };
  const clearItem = (id: string) => setCart((c) => { const n = { ...c }; delete n[id]; return n; });

  const cartItems = Object.entries(cart)
    .map(([id, qty]) => ({ item: items.find((i) => i.id === id)!, qty }))
    .filter((c) => c.item);
  const cartCount = cartItems.reduce((s, c) => s + c.qty, 0);

  const submitLend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/auth");
      return;
    }
    if (cartItems.length === 0) {
      toast.error("העגלה ריקה");
      return;
    }
    const parsed = lendSchema.safeParse({
      requester_name: lName, requester_email: lEmail, requester_phone: lPhone, notes: lNotes,
    });
    if (!parsed.success) {
      toast.error("יש למלא את כל השדות בצורה תקינה");
      return;
    }
    setLSubmitting(true);
    try {
      const { data: req, error: reqErr } = await supabase
        .from("lend_requests")
        .insert([{
          user_id: user.id,
          requester_name: parsed.data.requester_name,
          requester_email: parsed.data.requester_email,
          requester_phone: parsed.data.requester_phone,
          notes: parsed.data.notes ?? null,
        }])
        .select()
        .single();
      if (reqErr) throw reqErr;
      const { error: itemsErr } = await supabase.from("lend_request_items").insert(
        cartItems.map(({ item, qty }) => ({ request_id: req.id, item_id: item.id, quantity: qty }))
      );
      if (itemsErr) throw itemsErr;
      toast.success("הבקשה נשלחה!", { description: "ניצור קשר בקרוב" });
      setCart({}); setLNotes(""); setCartOpen(false);
    } catch (err) {
      toast.error("שגיאה בשליחה", { description: (err as Error).message });
    } finally {
      setLSubmitting(false);
    }
  };

  const submitItemRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/auth"); return; }
    const parsed = itemReqSchema.safeParse({
      item_name: riName, description: riDesc, reference_link: riLink,
      requester_name: lName || (user.user_metadata as Record<string, string>)?.full_name || "",
      requester_email: lEmail || user.email || "",
      requester_phone: lPhone,
    });
    if (!parsed.success) { toast.error("יש למלא שם, אימייל וטלפון בעגלה ושם פריט"); return; }
    setRiSubmitting(true);
    try {
      const { error } = await supabase.from("item_requests").insert({
        user_id: user.id,
        requester_name: parsed.data.requester_name,
        requester_email: parsed.data.requester_email,
        requester_phone: parsed.data.requester_phone,
        item_name: parsed.data.item_name,
        description: parsed.data.description || null,
        reference_link: parsed.data.reference_link || null,
      });
      if (error) throw error;
      toast.success("הבקשה נשלחה!", { description: "נבחן הוספת הפריט לקטלוג" });
      setRiName(""); setRiDesc(""); setRiLink(""); setReqOpen(false);
    } catch (err) {
      toast.error("שגיאה בשליחה", { description: (err as Error).message });
    } finally {
      setRiSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SiteNav />
      <main className="container mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
        <header className="mb-6 flex flex-col items-start justify-between gap-4 md:mb-8 md:flex-row md:items-end">
          <div className="text-center md:text-right">
            <h1 className="mb-2 text-3xl font-black text-foreground md:text-5xl">
              <span className="text-gradient">קטלוג</span> ציוד
            </h1>
            <p className="text-sm text-muted-foreground md:text-base">חפשו ציוד, הוסיפו לעגלה ושלחו בקשת השאלה</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/requests"><Printer className="h-4 w-4" />הדפסת תלת מימד</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setReqOpen(true)} className="gap-1.5">
              <PackagePlus className="h-4 w-4" />בקש פריט חדש
            </Button>
            {/* Desktop cart pill */}
            <Button
              size="sm"
              onClick={() => setCartOpen(true)}
              className="hidden gap-1.5 md:inline-flex"
            >
              <ShoppingCart className="h-4 w-4" />
              עגלה {cartCount > 0 && <span className="rounded-full bg-primary-foreground/20 px-2 text-xs">{cartCount}</span>}
            </Button>
          </div>
        </header>

        <div className="mb-6 space-y-4">
          <div className="relative mx-auto max-w-xl">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="חיפוש פריט לפי שם או תיאור..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 h-11"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <Button
              size="sm"
              variant={generalCategory === "all" ? "default" : "outline"}
              onClick={() => { setGeneralCategory("all"); setCategory("all"); }}
              className="rounded-full"
            >
              הכל ({generalCounts.all})
            </Button>
            {GENERAL_CATEGORIES.map((g) => (
              <Button
                key={g}
                size="sm"
                variant={generalCategory === g ? "default" : "outline"}
                onClick={() => { setGeneralCategory(g); setCategory("all"); }}
                className="rounded-full"
              >
                {GENERAL_CATEGORY_LABELS[g]} ({generalCounts[g]})
              </Button>
            ))}
          </div>

          <div className="flex justify-center">
            <Button
              size="sm"
              variant={showAdvanced ? "default" : "secondary"}
              onClick={() => setShowAdvanced((s) => !s)}
              className="rounded-full gap-2 shadow-sm"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {showAdvanced ? "הסתר סינון מתקדם" : "סינון מתקדם"}
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {showAdvanced && (
            <div className="flex flex-wrap justify-center gap-2 border-t border-border pt-3">
              <Button
                size="sm"
                variant={category === "all" ? "default" : "outline"}
                onClick={() => setCategory("all")}
                className="rounded-full"
              >
                כל תתי-הקטגוריות
              </Button>
              {visibleDetailed.map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={category === cat ? "default" : "outline"}
                  onClick={() => setCategory(cat)}
                  className="rounded-full"
                  disabled={detailedCounts[cat] === 0}
                >
                  {CATEGORY_LABELS[cat]} ({detailedCounts[cat]})
                </Button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <p className="rounded-lg border border-border bg-card p-12 text-center text-sm text-muted-foreground">
            טוען...
          </p>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {items.length === 0 ? "הקטלוג ריק כרגע" : "לא נמצאו פריטים תואמים"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 pb-24 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((item) => {
              const cat = normalizeCategory(item.category);
              const inCart = cart[item.id] ?? 0;
              const atMax = inCart >= item.quantity_available;
              return (
                <article
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => setDetails(item)}
                    className="group relative block aspect-square w-full overflow-hidden bg-muted"
                    aria-label={`פרטים על ${item.name}`}
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-full w-full object-contain p-2 transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ShoppingBag className="h-10 w-10" />
                      </div>
                    )}
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                      <Info className="h-3 w-3" /> פרטים
                    </span>
                  </button>
                  <div className="flex flex-1 flex-col p-3">
                    <Badge variant="secondary" className="mb-1.5 w-fit text-[10px]">
                      {CATEGORY_LABELS[cat]}
                    </Badge>
                    <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{item.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      זמין: <span className={item.quantity_available > 0 ? "font-medium text-foreground" : "font-medium text-destructive"}>{item.quantity_available}</span> / {item.quantity_total}
                    </p>
                    <Button
                      size="sm"
                      variant={inCart ? "secondary" : "default"}
                      className="mt-3 w-full gap-1.5"
                      onClick={() => addToCart(item)}
                      disabled={atMax || item.quantity_available === 0}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {item.quantity_available === 0
                        ? "אזל מהמלאי"
                        : inCart ? `בעגלה (${inCart})` : "הוסף לעגלה"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Item details dialog */}
        <Dialog open={!!details} onOpenChange={(o) => !o && setDetails(null)}>
          <DialogContent dir="rtl" className="max-w-lg">
            {details && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{details.name}</DialogTitle>
                  <DialogDescription>זמין כעת: {details.quantity_available} / {details.quantity_total}</DialogDescription>
                </DialogHeader>
                {details.image_url && (
                  <img
                    src={details.image_url}
                    alt={details.name}
                    className="mx-auto max-h-64 rounded-md bg-muted object-contain p-2"
                  />
                )}
                <Badge variant="secondary" className="w-fit">
                  {CATEGORY_LABELS[normalizeCategory(details.category)]}
                </Badge>
                {details.description ? (
                  <p className="whitespace-pre-line text-sm text-foreground">{details.description}</p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">אין תיאור נוסף</p>
                )}
                <DialogFooter className="sm:justify-start">
                  <Button
                    onClick={() => { addToCart(details); setDetails(null); }}
                    disabled={(cart[details.id] ?? 0) >= details.quantity_available || details.quantity_available === 0}
                    className="gap-1.5"
                  >
                    <Plus className="h-4 w-4" />הוסף לעגלה
                  </Button>
                  <Button variant="outline" onClick={() => setDetails(null)}>סגור</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Request new item dialog */}
        <Dialog open={reqOpen} onOpenChange={setReqOpen}>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader>
              <DialogTitle>בקשה לפריט חדש</DialogTitle>
              <DialogDescription>לא מצאתם בקטלוג? ספרו לנו על הפריט ואולי נזמין אותו.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submitItemRequest} className="space-y-3">
              <div>
                <Label htmlFor="ri-name">שם הפריט</Label>
                <Input id="ri-name" value={riName} onChange={(e) => setRiName(e.target.value)} required maxLength={150} />
              </div>
              <div>
                <Label htmlFor="ri-desc">תיאור / לשם מה תשמשו אותו</Label>
                <Textarea id="ri-desc" value={riDesc} onChange={(e) => setRiDesc(e.target.value)} rows={3} maxLength={1000} />
              </div>
              <div>
                <Label htmlFor="ri-link">קישור (לא חובה)</Label>
                <Input id="ri-link" type="url" value={riLink} onChange={(e) => setRiLink(e.target.value)} placeholder="https://..." maxLength={500} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="ri-r-name" className="text-xs">שם מלא</Label>
                  <Input id="ri-r-name" value={lName} onChange={(e) => setLName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="ri-r-email" className="text-xs">אימייל</Label>
                  <Input id="ri-r-email" type="email" value={lEmail} onChange={(e) => setLEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="ri-r-phone" className="text-xs">טלפון</Label>
                  <Input id="ri-r-phone" type="tel" value={lPhone} onChange={(e) => setLPhone(e.target.value)} required />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:justify-start">
                <Button type="submit" disabled={riSubmitting}>{riSubmitting ? "שולח..." : "שלח בקשה"}</Button>
                <Button type="button" variant="outline" onClick={() => setReqOpen(false)}>ביטול</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Floating cart FAB */}
        {!cartOpen && (
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label="פתח עגלה"
            className="group fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-lg shadow-primary/40 transition-all hover:scale-105 hover:shadow-xl md:bottom-6 md:left-6"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="text-sm font-semibold">עגלה</span>
            {cartCount > 0 && (
              <span
                key={bumpKey}
                className="inline-flex h-6 min-w-[1.5rem] animate-in zoom-in-50 items-center justify-center rounded-full bg-primary-foreground px-1.5 text-xs font-bold text-primary"
              >
                {cartCount}
              </span>
            )}
          </button>
        )}

        {/* Cart slide-in panel */}
        <Sheet open={cartOpen} onOpenChange={setCartOpen}>
          <SheetContent side="right" dir="rtl" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
            <SheetHeader className="border-b border-border px-5 py-4 text-right">
              <SheetTitle className="flex items-center gap-2 text-xl">
                <ShoppingCart className="h-5 w-5 text-primary" />
                העגלה שלי {cartCount > 0 && <span className="text-base text-muted-foreground">({cartCount})</span>}
              </SheetTitle>
              <SheetDescription>
                סקרו את הפריטים, מלאו פרטים ושלחו בקשת השאלה
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {cartItems.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <ShoppingCart className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">העגלה ריקה</p>
                  <Button variant="outline" size="sm" onClick={() => setCartOpen(false)}>
                    המשך לעיין בקטלוג
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {cartItems.map(({ item, qty }) => (
                    <li key={item.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="h-full w-full object-contain p-1" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <ShoppingBag className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">זמין: {item.quantity_available}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => decFromCart(item.id)}><Minus className="h-3.5 w-3.5" /></Button>
                        <span className="w-6 text-center text-sm font-medium">{qty}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => incFromCart(item.id)} disabled={qty >= item.quantity_available}><Plus className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => clearItem(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {cartItems.length > 0 && (
              <form onSubmit={submitLend} className="space-y-3 border-t border-border bg-card/40 px-5 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="l-name" className="text-xs">שם מלא</Label>
                    <Input id="l-name" value={lName} onChange={(e) => setLName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="l-phone" className="text-xs">טלפון</Label>
                    <Input id="l-phone" type="tel" value={lPhone} onChange={(e) => setLPhone(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="l-email" className="text-xs">אימייל</Label>
                  <Input id="l-email" type="email" value={lEmail} onChange={(e) => setLEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="l-notes" className="text-xs">הערות (לא חובה)</Label>
                  <Textarea id="l-notes" value={lNotes} onChange={(e) => setLNotes(e.target.value)} rows={2} />
                </div>
                {!user ? (
                  <Button type="button" className="w-full" onClick={() => navigate("/auth")}>
                    התחברו כדי להגיש בקשה
                  </Button>
                ) : (
                  <Button type="submit" disabled={lSubmitting} className="w-full">
                    {lSubmitting ? "שולח..." : `שלח בקשת השאלה (${cartCount})`}
                  </Button>
                )}
              </form>
            )}
          </SheetContent>
        </Sheet>
      </main>
    </div>
  );
};

export default Catalog;
