import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SiteNav from "@/components/SiteNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Printer, ShoppingBag, Plus, Minus, Trash2, Upload, PackagePlus, Info } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  quantity_available: number;
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
                <h2 className="mb-4 text-xl font-bold text-foreground">קטלוג ציוד</h2>
                {items.length === 0 ? (
                  <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                    אין פריטים בקטלוג כרגע
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {items.map((item) => (
                      <div key={item.id} className="overflow-hidden rounded-lg border border-border bg-card">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="h-40 w-full object-cover" />
                        ) : (
                          <div className="flex h-40 items-center justify-center bg-muted text-muted-foreground">
                            <ShoppingBag className="h-8 w-8" />
                          </div>
                        )}
                        <div className="p-4">
                          <h3 className="font-semibold text-foreground">{item.name}</h3>
                          {item.description && <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>}
                          <p className="mt-2 text-xs text-muted-foreground">זמין: {item.quantity_available}</p>
                          <Button
                            size="sm"
                            variant={cart[item.id] ? "secondary" : "default"}
                            className="mt-3 w-full gap-1.5"
                            onClick={() => addToCart(item.id)}
                            disabled={(cart[item.id] ?? 0) >= item.quantity_available}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {cart[item.id] ? `נוסף (${cart[item.id]})` : "הוסף לעגלה"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
      </main>
    </div>
  );
};

export default Requests;
