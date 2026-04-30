import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SiteNav from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Printer, ShoppingBag, Plus, Minus, Trash2, Upload, PackagePlus, Info, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { CATEGORIES, CATEGORY_LABELS, normalizeCategory, type CatalogCategory } from "@/lib/categories";
import { fetchActiveFilamentColors, type FilamentColor } from "@/lib/filamentColors";

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  quantity_available: number;
  category: string;
}

const printSchema = z.object({
  requester_name: z.string().trim().min(2).max(100),
  requester_email: z.string().trim().email().max(255),
  requester_phone: z.string().trim().min(7).max(20),
  purpose: z.string().trim().min(5).max(1000),
  filament_color: z.string().trim().min(1).max(50),
});

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

const Requests = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [catalogCategory, setCatalogCategory] = useState<CatalogCategory | "all">("all");

  // Print form state
  const [pName, setPName] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pPurpose, setPPurpose] = useState("");
  const [pColor, setPColor] = useState("");
  const [pFile, setPFile] = useState<File | null>(null);
  const [pSubmitting, setPSubmitting] = useState(false);

  // Lend form state
  const [lName, setLName] = useState("");
  const [lEmail, setLEmail] = useState("");
  const [lPhone, setLPhone] = useState("");
  const [lNotes, setLNotes] = useState("");
  const [lSubmitting, setLSubmitting] = useState(false);

  // Item details dialog
  const [detailsItem, setDetailsItem] = useState<CatalogItem | null>(null);

  // "Request new item" dialog state
  const [reqOpen, setReqOpen] = useState(false);
  const [riName, setRiName] = useState("");
  const [riDesc, setRiDesc] = useState("");
  const [riLink, setRiLink] = useState("");
  const [riSubmitting, setRiSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    // Prefill from email
    setPEmail(user.email ?? "");
    setLEmail(user.email ?? "");
    const meta = (user.user_metadata ?? {}) as Record<string, string>;
    const name = meta.full_name || meta.name || "";
    setPName(name);
    setLName(name);
  }, [user]);

  useEffect(() => {
    supabase.from("catalog_items").select("*").order("name").then(({ data }) => {
      setItems(data ?? []);
    });
  }, []);

  const addToCart = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const removeFromCart = (id: string) => setCart((c) => {
    const n = { ...c };
    if ((n[id] ?? 0) <= 1) delete n[id];
    else n[id] -= 1;
    return n;
  });
  const clearItem = (id: string) => setCart((c) => { const n = { ...c }; delete n[id]; return n; });

  const cartItems = Object.entries(cart).map(([id, qty]) => ({
    item: items.find((i) => i.id === id)!,
    qty,
  })).filter((c) => c.item);

  const submitPrint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!pFile) {
      toast.error("יש לצרף קובץ STL");
      return;
    }
    if (pFile.size > 50 * 1024 * 1024) {
      toast.error("הקובץ גדול מדי (מקסימום 50MB)");
      return;
    }
    const parsed = printSchema.safeParse({
      requester_name: pName, requester_email: pEmail, requester_phone: pPhone,
      purpose: pPurpose, filament_color: pColor,
    });
    if (!parsed.success) {
      toast.error("יש למלא את כל השדות בצורה תקינה");
      return;
    }
    setPSubmitting(true);
    try {
      const path = `${user.id}/${Date.now()}-${pFile.name}`;
      const { error: upErr } = await supabase.storage.from("stl-files").upload(path, pFile);
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("print_requests").insert([{
        user_id: user.id,
        requester_name: parsed.data.requester_name,
        requester_email: parsed.data.requester_email,
        requester_phone: parsed.data.requester_phone,
        purpose: parsed.data.purpose,
        filament_color: parsed.data.filament_color,
        stl_file_path: path,
        stl_file_name: pFile.name,
      }]);
      if (insErr) throw insErr;
      toast.success("הבקשה נשלחה!", { description: "ניצור קשר בקרוב" });
      setPPurpose(""); setPColor(""); setPFile(null);
      (document.getElementById("stl-file-input") as HTMLInputElement).value = "";
    } catch (err) {
      toast.error("שגיאה בשליחה", { description: (err as Error).message });
    } finally {
      setPSubmitting(false);
    }
  };

  const submitLend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
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
      setCart({}); setLNotes("");
    } catch (err) {
      toast.error("שגיאה בשליחה", { description: (err as Error).message });
    } finally {
      setLSubmitting(false);
    }
  };

  const submitItemRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = itemReqSchema.safeParse({
      item_name: riName, description: riDesc, reference_link: riLink,
      requester_name: lName, requester_email: lEmail, requester_phone: lPhone,
    });
    if (!parsed.success) { toast.error("יש למלא את כל השדות בצורה תקינה"); return; }
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

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SiteNav />
      <main className="container mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-4xl font-black text-foreground md:text-5xl">
            <span className="text-gradient">בקשות</span>
          </h1>
          <p className="text-muted-foreground">שלחו קבצים להדפסה או השאילו ציוד מהמייקרספייס</p>
        </div>

        <Tabs defaultValue="print" dir="rtl">
          <TabsList className="mx-auto mb-8 flex w-fit">
            <TabsTrigger value="print" className="gap-1.5"><Printer className="h-4 w-4" />הדפסת תלת מימד</TabsTrigger>
            <TabsTrigger value="lend" className="gap-1.5"><ShoppingBag className="h-4 w-4" />השאלת ציוד</TabsTrigger>
          </TabsList>

          <TabsContent value="print">
            <form onSubmit={submitPrint} className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-border bg-card p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="p-name">שם מלא</Label>
                  <Input id="p-name" value={pName} onChange={(e) => setPName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="p-email">אימייל</Label>
                  <Input id="p-email" type="email" value={pEmail} onChange={(e) => setPEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="p-phone">טלפון</Label>
                  <Input id="p-phone" type="tel" value={pPhone} onChange={(e) => setPPhone(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="p-color">צבע פילמנט</Label>
                  <Input id="p-color" value={pColor} onChange={(e) => setPColor(e.target.value)} placeholder="לדוגמה: שחור, כחול" required />
                </div>
              </div>
              <div>
                <Label htmlFor="p-purpose">מטרת ההדפסה</Label>
                <Textarea id="p-purpose" value={pPurpose} onChange={(e) => setPPurpose(e.target.value)} rows={4} required placeholder="ספרו על הפרויקט והשימוש המיועד..." />
              </div>
              <div>
                <Label htmlFor="stl-file-input">קובץ STL</Label>
                <div className="mt-1 flex items-center gap-3 rounded-md border border-dashed border-border bg-background p-4">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <input
                    id="stl-file-input"
                    type="file"
                    accept=".stl,.STL"
                    onChange={(e) => setPFile(e.target.files?.[0] ?? null)}
                    className="flex-1 text-sm"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">קבצי STL בלבד, עד 50MB</p>
              </div>
              <Button type="submit" disabled={pSubmitting} size="lg" className="w-full">
                {pSubmitting ? "שולח..." : "שלח בקשה"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="lend">
            <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
              {/* Catalog */}
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-foreground">קטלוג ציוד</h2>
                  <Button variant="outline" size="sm" onClick={() => setReqOpen(true)} className="gap-1.5">
                    <PackagePlus className="h-4 w-4" />
                    בקש פריט שלא בקטלוג
                  </Button>
                </div>
                <div className="mb-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={catalogCategory === "all" ? "default" : "outline"}
                    onClick={() => setCatalogCategory("all")}
                    className="rounded-full"
                  >
                    הכל
                  </Button>
                  {CATEGORIES.map((cat) => (
                    <Button
                      key={cat}
                      size="sm"
                      variant={catalogCategory === cat ? "default" : "outline"}
                      onClick={() => setCatalogCategory(cat)}
                      className="rounded-full"
                    >
                      {CATEGORY_LABELS[cat]}
                    </Button>
                  ))}
                </div>
                {(() => {
                  const visible = catalogCategory === "all"
                    ? items
                    : items.filter((it) => normalizeCategory(it.category) === catalogCategory);
                  return visible.length === 0 ? (
                    <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                      אין פריטים בקטגוריה זו
                    </p>
                  ) : (
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                    {visible.map((item) => {
                      const inCart = cart[item.id] ?? 0;
                      const atMax = inCart >= item.quantity_available;
                      return (
                        <div key={item.id} className="flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md">
                          <button
                            type="button"
                            onClick={() => setDetailsItem(item)}
                            className="group relative block aspect-square w-full overflow-hidden bg-muted"
                            aria-label={`פרטים על ${item.name}`}
                          >
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="h-full w-full object-contain p-2 transition-transform group-hover:scale-105" />
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
                              {CATEGORY_LABELS[normalizeCategory(item.category)]}
                            </Badge>
                            <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{item.name}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">זמין: {item.quantity_available}</p>
                            <Button
                              size="sm"
                              variant={inCart ? "secondary" : "default"}
                              className="mt-auto w-full gap-1.5"
                              onClick={() => addToCart(item.id)}
                              disabled={atMax}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              {inCart ? `נוסף (${inCart})` : "הוסף לעגלה"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  );
                })()}
              </div>

              {/* Cart + form */}
              <aside className="sticky top-20 h-fit space-y-4 rounded-2xl border border-border bg-card p-6">
                <h2 className="text-lg font-bold text-foreground">העגלה שלי</h2>
                {cartItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">אין פריטים בעגלה</p>
                ) : (
                  <ul className="space-y-2">
                    {cartItems.map(({ item, qty }) => (
                      <li key={item.id} className="flex items-center gap-2 rounded-md bg-background p-2 text-sm">
                        <span className="flex-1 truncate">{item.name}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeFromCart(item.id)}><Minus className="h-3.5 w-3.5" /></Button>
                        <span className="w-6 text-center">{qty}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => addToCart(item.id)} disabled={qty >= item.quantity_available}><Plus className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => clearItem(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </li>
                    ))}
                  </ul>
                )}
                <form onSubmit={submitLend} className="space-y-3 border-t border-border pt-4">
                  <div>
                    <Label htmlFor="l-name" className="text-xs">שם מלא</Label>
                    <Input id="l-name" value={lName} onChange={(e) => setLName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="l-email" className="text-xs">אימייל</Label>
                    <Input id="l-email" type="email" value={lEmail} onChange={(e) => setLEmail(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="l-phone" className="text-xs">טלפון</Label>
                    <Input id="l-phone" type="tel" value={lPhone} onChange={(e) => setLPhone(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="l-notes" className="text-xs">הערות (לא חובה)</Label>
                    <Textarea id="l-notes" value={lNotes} onChange={(e) => setLNotes(e.target.value)} rows={2} />
                  </div>
                  <Button type="submit" disabled={lSubmitting || cartItems.length === 0} className="w-full">
                    {lSubmitting ? "שולח..." : "שלח בקשת השאלה"}
                  </Button>
                </form>
              </aside>
            </div>
          </TabsContent>
        </Tabs>

        {/* Item details dialog */}
        <Dialog open={!!detailsItem} onOpenChange={(o) => !o && setDetailsItem(null)}>
          <DialogContent dir="rtl" className="max-w-lg">
            {detailsItem && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{detailsItem.name}</DialogTitle>
                  <DialogDescription>זמין כעת: {detailsItem.quantity_available}</DialogDescription>
                </DialogHeader>
                {detailsItem.image_url && (
                  <div className="overflow-hidden rounded-lg bg-muted">
                    <img src={detailsItem.image_url} alt={detailsItem.name} className="mx-auto max-h-72 w-full object-contain p-3" />
                  </div>
                )}
                {detailsItem.description ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{detailsItem.description}</p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">אין תיאור נוסף</p>
                )}
                <DialogFooter className="sm:justify-start">
                  <Button
                    onClick={() => { addToCart(detailsItem.id); setDetailsItem(null); }}
                    disabled={(cart[detailsItem.id] ?? 0) >= detailsItem.quantity_available}
                    className="gap-1.5"
                  >
                    <Plus className="h-4 w-4" />הוסף לעגלה
                  </Button>
                  <Button variant="outline" onClick={() => setDetailsItem(null)}>סגור</Button>
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
              <p className="text-xs text-muted-foreground">פרטי קשר ייקחו מטופס ההשאלה (שם, אימייל, טלפון).</p>
              <DialogFooter className="gap-2 sm:justify-start">
                <Button type="submit" disabled={riSubmitting}>{riSubmitting ? "שולח..." : "שלח בקשה"}</Button>
                <Button type="button" variant="outline" onClick={() => setReqOpen(false)}>ביטול</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Requests;
