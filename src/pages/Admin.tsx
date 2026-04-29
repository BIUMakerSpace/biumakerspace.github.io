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
import { Package, Printer, ShoppingBag, Plus, Trash2, Download, ClipboardList, Search } from "lucide-react";
import { toast } from "sonner";

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  quantity_total: number;
  quantity_available: number;
}

interface PrintReq {
  id: string;
  requester_name: string;
  requester_email: string;
  requester_phone: string;
  purpose: string;
  filament_color: string;
  stl_file_path: string;
  stl_file_name: string;
  status: string;
  created_at: string;
}

interface LendReq {
  id: string;
  requester_name: string;
  requester_email: string;
  requester_phone: string;
  notes: string | null;
  status: string;
  created_at: string;
  delivered_at: string | null;
  returned_at: string | null;
  lend_request_items: { quantity: number; catalog_items: { name: string } }[];
}

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [printReqs, setPrintReqs] = useState<PrintReq[]>([]);
  const [lendReqs, setLendReqs] = useState<LendReq[]>([]);

  // New item form
  const [iName, setIName] = useState("");
  const [iDesc, setIDesc] = useState("");
  const [iQty, setIQty] = useState(1);
  const [iImage, setIImage] = useState<File | null>(null);
  const [iSubmitting, setISubmitting] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/auth", { replace: true });
    else if (!isAdmin) navigate("/", { replace: true });
  }, [user, isAdmin, loading, navigate]);

  const loadAll = async () => {
    const [a, b, c] = await Promise.all([
      supabase.from("catalog_items").select("*").order("name"),
      supabase.from("print_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("lend_requests").select("*, lend_request_items(quantity, catalog_items(name))").order("created_at", { ascending: false }),
    ]);
    setItems(a.data ?? []);
    setPrintReqs(b.data ?? []);
    setLendReqs((c.data as LendReq[]) ?? []);
  };

  useEffect(() => { if (isAdmin) loadAll(); }, [isAdmin]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setISubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (iImage) {
        const path = `${Date.now()}-${iImage.name}`;
        const { error: upErr } = await supabase.storage.from("catalog-images").upload(path, iImage);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("catalog-images").getPublicUrl(path);
        imageUrl = data.publicUrl;
      }
      const { error } = await supabase.from("catalog_items").insert({
        name: iName, description: iDesc || null, image_url: imageUrl,
        quantity_total: iQty, quantity_available: iQty,
      });
      if (error) throw error;
      toast.success("פריט נוסף");
      setIName(""); setIDesc(""); setIQty(1); setIImage(null);
      (document.getElementById("img-input") as HTMLInputElement).value = "";
      loadAll();
    } catch (err) {
      toast.error("שגיאה", { description: (err as Error).message });
    } finally {
      setISubmitting(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("למחוק פריט זה?")) return;
    const { error } = await supabase.from("catalog_items").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("נמחק"); loadAll(); }
  };

  const updateItemQty = async (id: string, available: number, total: number) => {
    const { error } = await supabase.from("catalog_items").update({ quantity_available: available, quantity_total: total }).eq("id", id);
    if (error) toast.error(error.message); else loadAll();
  };

  const updatePrintStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("print_requests").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("עודכן"); loadAll(); }
  };

  const downloadStl = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from("stl-files").createSignedUrl(path, 60);
    if (error || !data) { toast.error("שגיאה בהורדה"); return; }
    const a = document.createElement("a");
    a.href = data.signedUrl; a.download = name; a.click();
  };

  const updateLendStatus = async (id: string, updates: { status?: string; delivered_at?: string; returned_at?: string }) => {
    const { error } = await supabase.from("lend_requests").update(updates).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("עודכן"); loadAll(); }
  };

  if (loading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SiteNav />
      <main className="container mx-auto max-w-6xl px-6 py-12">
        <h1 className="mb-8 text-4xl font-black text-foreground">
          <span className="text-gradient">ניהול</span> מייקרספייס
        </h1>

        <Tabs defaultValue="catalog" dir="rtl">
          <TabsList className="mb-6">
            <TabsTrigger value="catalog" className="gap-1.5"><Package className="h-4 w-4" />קטלוג</TabsTrigger>
            <TabsTrigger value="print" className="gap-1.5"><Printer className="h-4 w-4" />הדפסות ({printReqs.length})</TabsTrigger>
            <TabsTrigger value="lend" className="gap-1.5"><ShoppingBag className="h-4 w-4" />השאלות ({lendReqs.length})</TabsTrigger>
            <TabsTrigger value="onloan" className="gap-1.5"><ClipboardList className="h-4 w-4" />ציוד מושאל</TabsTrigger>
          </TabsList>

          <TabsContent value="catalog">
            <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
              <form onSubmit={addItem} className="space-y-4 rounded-2xl border border-border bg-card p-6 h-fit">
                <h2 className="text-lg font-bold">הוספת פריט</h2>
                <div><Label>שם הפריט</Label><Input value={iName} onChange={(e) => setIName(e.target.value)} required /></div>
                <div><Label>תיאור</Label><Textarea value={iDesc} onChange={(e) => setIDesc(e.target.value)} rows={2} /></div>
                <div><Label>כמות</Label><Input type="number" min={1} value={iQty} onChange={(e) => setIQty(parseInt(e.target.value) || 1)} required /></div>
                <div><Label>תמונה</Label><input id="img-input" type="file" accept="image/*" onChange={(e) => setIImage(e.target.files?.[0] ?? null)} className="block w-full text-sm" /></div>
                <Button type="submit" disabled={iSubmitting} className="w-full gap-1.5"><Plus className="h-4 w-4" />{iSubmitting ? "מוסיף..." : "הוסף לקטלוג"}</Button>
              </form>

              <div>
                <h2 className="mb-4 text-lg font-bold">פריטים קיימים ({items.length})</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3 rounded-lg border border-border bg-card p-3">
                      {item.image_url && <img src={item.image_url} alt={item.name} className="h-20 w-20 rounded object-cover" />}
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.name}</h3>
                        {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span>זמין:</span>
                          <Input type="number" value={item.quantity_available} onChange={(e) => updateItemQty(item.id, parseInt(e.target.value) || 0, item.quantity_total)} className="h-7 w-16" />
                          <span>/ סה״כ:</span>
                          <Input type="number" value={item.quantity_total} onChange={(e) => updateItemQty(item.id, item.quantity_available, parseInt(e.target.value) || 0)} className="h-7 w-16" />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteItem(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="print">
            <div className="space-y-3">
              {printReqs.length === 0 && <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">אין בקשות</p>}
              {printReqs.map((r) => (
                <div key={r.id} className="rounded-lg border border-border bg-card p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">{r.requester_name}</h3>
                      <p className="text-xs text-muted-foreground">{r.requester_email} · {r.requester_phone} · {new Date(r.created_at).toLocaleDateString("he-IL")}</p>
                    </div>
                    <select value={r.status} onChange={(e) => updatePrintStatus(r.id, e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-sm">
                      <option value="pending">ממתין</option>
                      <option value="printing">מדפיס</option>
                      <option value="ready">מוכן לאיסוף</option>
                      <option value="completed">הושלם</option>
                      <option value="rejected">נדחה</option>
                    </select>
                  </div>
                  <p className="text-sm"><strong>מטרה:</strong> {r.purpose}</p>
                  <p className="text-sm"><strong>צבע:</strong> {r.filament_color}</p>
                  <Button size="sm" variant="outline" className="mt-2 gap-1.5" onClick={() => downloadStl(r.stl_file_path, r.stl_file_name)}>
                    <Download className="h-3.5 w-3.5" />{r.stl_file_name}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="lend">
            <div className="space-y-3">
              {lendReqs.length === 0 && <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">אין בקשות</p>}
              {lendReqs.map((r) => (
                <div key={r.id} className="rounded-lg border border-border bg-card p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">{r.requester_name}</h3>
                      <p className="text-xs text-muted-foreground">{r.requester_email} · {r.requester_phone} · {new Date(r.created_at).toLocaleDateString("he-IL")}</p>
                    </div>
                    <select value={r.status} onChange={(e) => {
                      const updates: { status: string; delivered_at?: string; returned_at?: string } = { status: e.target.value };
                      if (e.target.value === "delivered" && !r.delivered_at) updates.delivered_at = new Date().toISOString();
                      if (e.target.value === "returned" && !r.returned_at) updates.returned_at = new Date().toISOString();
                      updateLendStatus(r.id, updates);
                    }} className="rounded-md border border-border bg-background px-2 py-1 text-sm">
                      <option value="pending">ממתין</option>
                      <option value="approved">אושר</option>
                      <option value="delivered">נמסר</option>
                      <option value="returned">הוחזר</option>
                      <option value="rejected">נדחה</option>
                    </select>
                  </div>
                  <ul className="text-sm">
                    {r.lend_request_items?.map((li, idx) => (
                      <li key={idx}>• {li.catalog_items?.name} × {li.quantity}</li>
                    ))}
                  </ul>
                  {r.notes && <p className="mt-2 text-sm"><strong>הערות:</strong> {r.notes}</p>}
                  {r.delivered_at && <p className="mt-1 text-xs text-muted-foreground">נמסר: {new Date(r.delivered_at).toLocaleDateString("he-IL")}</p>}
                  {r.returned_at && <p className="text-xs text-muted-foreground">הוחזר: {new Date(r.returned_at).toLocaleDateString("he-IL")}</p>}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="onloan">
            {(() => {
              const onLoan = lendReqs.filter((r) => r.status === "delivered");
              const q = search.trim().toLowerCase();
              const filtered = q
                ? onLoan.filter((r) =>
                    r.requester_name.toLowerCase().includes(q) ||
                    r.requester_email.toLowerCase().includes(q) ||
                    r.requester_phone.toLowerCase().includes(q) ||
                    r.lend_request_items?.some((li) => li.catalog_items?.name.toLowerCase().includes(q))
                  )
                : onLoan;
              const totalItems = filtered.reduce(
                (sum, r) => sum + (r.lend_request_items?.reduce((s, li) => s + li.quantity, 0) ?? 0),
                0
              );
              return (
                <div>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="relative max-w-sm flex-1">
                      <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="חיפוש לפי שם, אימייל, טלפון או פריט..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pr-9"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {filtered.length} השאלות · {totalItems} פריטים
                    </p>
                  </div>

                  {filtered.length === 0 ? (
                    <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                      אין ציוד מושאל כרגע
                    </p>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-border bg-card">
                      <table className="w-full text-sm">
                        <thead className="border-b border-border bg-muted/50 text-right">
                          <tr>
                            <th className="p-3 font-semibold">שואל</th>
                            <th className="p-3 font-semibold">קשר</th>
                            <th className="p-3 font-semibold">פריטים</th>
                            <th className="p-3 font-semibold">תאריך מסירה</th>
                            <th className="p-3 font-semibold">פעולה</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((r) => (
                            <tr key={r.id} className="border-b border-border last:border-0">
                              <td className="p-3 font-medium">{r.requester_name}</td>
                              <td className="p-3 text-xs text-muted-foreground">
                                <div>{r.requester_email}</div>
                                <div>{r.requester_phone}</div>
                              </td>
                              <td className="p-3">
                                <ul className="space-y-0.5">
                                  {r.lend_request_items?.map((li, i) => (
                                    <li key={i}>• {li.catalog_items?.name} × {li.quantity}</li>
                                  ))}
                                </ul>
                              </td>
                              <td className="p-3 text-xs">
                                {r.delivered_at ? new Date(r.delivered_at).toLocaleDateString("he-IL") : "—"}
                              </td>
                              <td className="p-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    updateLendStatus(r.id, { status: "returned", returned_at: new Date().toISOString() })
                                  }
                                >
                                  סמן כהוחזר
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
