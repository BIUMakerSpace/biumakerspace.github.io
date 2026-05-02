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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Package, Printer, ShoppingBag, Plus, Trash2, Download, ClipboardList, Search, Pencil, Upload, FileDown, Palette, Users } from "lucide-react";
import FilamentColorsManager from "@/components/admin/FilamentColorsManager";
import ItemSourcesManager from "@/components/admin/ItemSourcesManager";
import ItemSourcesEditor from "@/components/admin/ItemSourcesEditor";
import CatalogTableView from "@/components/admin/CatalogTableView";
import DeliverDialog from "@/components/admin/DeliverDialog";
import CreateLendForUser from "@/components/admin/CreateLendForUser";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, CATEGORY_LABELS, normalizeCategory, type CatalogCategory } from "@/lib/categories";
import { Warehouse } from "lucide-react";

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  quantity_total: number;
  quantity_available: number;
  category: string;
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
  lend_request_items: { id: string; item_id: string; quantity: number; catalog_items: { name: string } }[];
}

interface ItemReq {
  id: string; item_name: string; description: string | null; reference_link: string | null;
  requester_name: string; requester_email: string; requester_phone: string;
  status: string; created_at: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  role?: "admin" | "user";
}

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [printReqs, setPrintReqs] = useState<PrintReq[]>([]);
  const [lendReqs, setLendReqs] = useState<LendReq[]>([]);
  const [itemReqs, setItemReqs] = useState<ItemReq[]>([]);
  const [deliverFor, setDeliverFor] = useState<LendReq | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [createLendFor, setCreateLendFor] = useState<UserProfile | null>(null);

  // New item form
  const [iName, setIName] = useState("");
  const [iDesc, setIDesc] = useState("");
  const [iQty, setIQty] = useState(1);
  const [iCategory, setICategory] = useState<CatalogCategory>("other");
  const [iImage, setIImage] = useState<File | null>(null);
  const [iSubmitting, setISubmitting] = useState(false);
  const [iSourceId, setISourceId] = useState("");
  const [iNewSourceName, setINewSourceName] = useState("");
  const [iCreatingSource, setICreatingSource] = useState(false);
  const [sourcesList, setSourcesList] = useState<{ id: string; name: string; is_active: boolean }[]>([]);
  const [search, setSearch] = useState("");
  const [catalogView, setCatalogView] = useState<"cards" | "table">("cards");
  const [printStatusFilter, setPrintStatusFilter] = useState<string>("all");
  const [lendStatusFilter, setLendStatusFilter] = useState<string>("all");

  // Edit item dialog state
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [eName, setEName] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [eTotal, setETotal] = useState(1);
  const [eAvailable, setEAvailable] = useState(1);
  const [eCategory, setECategory] = useState<CatalogCategory>("other");
  const [eImage, setEImage] = useState<File | null>(null);
  const [eSubmitting, setESubmitting] = useState(false);

  const openEdit = (item: CatalogItem) => {
    setEditItem(item);
    setEName(item.name);
    setEDesc(item.description ?? "");
    setETotal(item.quantity_total);
    setEAvailable(item.quantity_available);
    setECategory(normalizeCategory(item.category));
    setEImage(null);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setESubmitting(true);
    try {
      let imageUrl = editItem.image_url;
      if (eImage) {
        const path = `${Date.now()}-${eImage.name}`;
        const { error: upErr } = await supabase.storage.from("catalog-images").upload(path, eImage);
        if (upErr) throw upErr;
        imageUrl = supabase.storage.from("catalog-images").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("catalog_items").update({
        name: eName,
        description: eDesc || null,
        category: eCategory,
        image_url: imageUrl,
      }).eq("id", editItem.id);
      if (error) throw error;
      toast.success("הפריט עודכן");
      setEditItem(null);
      loadAll();
    } catch (err) {
      toast.error("שגיאה", { description: (err as Error).message });
    } finally {
      setESubmitting(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/auth", { replace: true });
    else if (!isAdmin) navigate("/", { replace: true });
  }, [user, isAdmin, loading, navigate]);

  const loadAll = async () => {
    const [a, b, c, d] = await Promise.all([
      supabase.from("catalog_items").select("*").order("name"),
      supabase.from("print_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("lend_requests").select("*, lend_request_items(id, item_id, quantity, catalog_items(name))").order("created_at", { ascending: false }),
      supabase.from("item_requests").select("*").order("created_at", { ascending: false }),
    ]);
    setItems(a.data ?? []);
    setPrintReqs(b.data ?? []);
    setLendReqs((c.data as unknown as LendReq[]) ?? []);
    setItemReqs(d.data ?? []);
  };

  const loadSourcesList = async () => {
    const { data } = await supabase
      .from("item_sources")
      .select("id, name, is_active")
      .order("sort_order").order("name");
    setSourcesList((data ?? []) as { id: string; name: string; is_active: boolean }[]);
  };

  const loadUsers = async () => {
    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, phone, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleMap = new Map<string, "admin" | "user">();
    (roles ?? []).forEach((r: { user_id: string; role: "admin" | "user" }) => roleMap.set(r.user_id, r.role));
    setUsers(((profs ?? []) as UserProfile[]).map((p) => ({ ...p, role: roleMap.get(p.id) ?? "user" })));
  };

  useEffect(() => { if (isAdmin) { loadAll(); loadSourcesList(); loadUsers(); } }, [isAdmin]);

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

      // Resolve storage source: either existing id or new name
      let resolvedSourceId = iSourceId;
      if (!resolvedSourceId && iNewSourceName.trim()) {
        const name = iNewSourceName.trim();
        const existing = sourcesList.find((s) => s.name.trim().toLowerCase() === name.toLowerCase());
        if (existing) resolvedSourceId = existing.id;
        else {
          const { data: created, error: srcErr } = await supabase
            .from("item_sources").insert({ name }).select("id").single();
          if (srcErr) throw srcErr;
          resolvedSourceId = created.id;
        }
      }

      const { data: inserted, error } = await supabase.from("catalog_items").insert({
        name: iName, description: iDesc || null, image_url: imageUrl,
        quantity_total: iQty, quantity_available: iQty,
        category: iCategory,
      }).select("id").single();
      if (error) throw error;

      if (resolvedSourceId) {
        const { error: cisErr } = await supabase.from("catalog_item_sources").insert({
          item_id: inserted.id, source_id: resolvedSourceId, quantity: iQty,
        });
        if (cisErr) throw cisErr;
      }

      toast.success("פריט נוסף");
      setIName(""); setIDesc(""); setIQty(1); setICategory("other"); setIImage(null);
      setISourceId(""); setINewSourceName(""); setICreatingSource(false);
      (document.getElementById("img-input") as HTMLInputElement).value = "";
      loadAll();
      loadSourcesList();
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

  const csvEscape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const buildAndDownloadCsv = (rows: (string | number)[][], filename: string) => {
    const headers = ["name", "description", "category", "quantity_total", "quantity_available", "image_url"];
    const csv = "\uFEFF" + [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsvFormat = () => {
    buildAndDownloadCsv(
      [["דוגמה: מברג", "תיאור הפריט", "tools", 5, 5, ""]],
      "catalog-template.csv"
    );
  };

  const downloadCsvCatalog = () => {
    if (!items.length) return;
    buildAndDownloadCsv(
      items.map((it) => [it.name, it.description ?? "", normalizeCategory(it.category), it.quantity_total, it.quantity_available, it.image_url ?? ""]),
      "catalog-export.csv"
    );
  };

  const parseCsv = (text: string): string[][] => {
    const rows: string[][] = [];
    let cur: string[] = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ",") { cur.push(field); field = ""; }
        else if (c === "\n" || c === "\r") {
          if (c === "\r" && text[i + 1] === "\n") i++;
          cur.push(field); field = "";
          if (cur.some((v) => v !== "")) rows.push(cur);
          cur = [];
        } else field += c;
      }
    }
    if (field !== "" || cur.length) { cur.push(field); if (cur.some((v) => v !== "")) rows.push(cur); }
    return rows;
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = (await file.text()).replace(/^\uFEFF/, "");
      const rows = parseCsv(text);
      if (rows.length < 2) { toast.error("הקובץ ריק"); return; }
      const headers = rows[0].map((h) => h.trim().toLowerCase());
      const idx = (k: string) => headers.indexOf(k);
      const iN = idx("name"), iD = idx("description"), iT = idx("quantity_total"), iA = idx("quantity_available"), iU = idx("image_url"), iC = idx("category");
      if (iN === -1) { toast.error("חסרה עמודת name"); return; }
      const records = rows.slice(1).map((r) => {
        const total = iT !== -1 ? parseInt(r[iT]) || 0 : 1;
        const avail = iA !== -1 ? parseInt(r[iA]) || 0 : total;
        return {
          name: r[iN]?.trim(),
          description: iD !== -1 ? (r[iD]?.trim() || null) : null,
          quantity_total: total,
          quantity_available: Math.min(avail, total),
          image_url: iU !== -1 ? (r[iU]?.trim() || null) : null,
          category: iC !== -1 ? normalizeCategory(r[iC]) : "other",
        };
      }).filter((r) => r.name);
      if (!records.length) { toast.error("אין שורות תקינות"); return; }
      const { error } = await supabase.from("catalog_items").insert(records);
      if (error) throw error;
      toast.success(`נוספו ${records.length} פריטים`);
      loadAll();
    } catch (err) {
      toast.error("שגיאה", { description: (err as Error).message });
    }
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
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="catalog" className="gap-1.5"><Package className="h-4 w-4" />קטלוג</TabsTrigger>
            <TabsTrigger value="sources" className="gap-1.5"><Warehouse className="h-4 w-4" />מקורות</TabsTrigger>
            <TabsTrigger value="print" className="gap-1.5"><Printer className="h-4 w-4" />הדפסות ({printReqs.filter((r) => r.status === "pending").length})</TabsTrigger>
            <TabsTrigger value="lend" className="gap-1.5"><ShoppingBag className="h-4 w-4" />השאלות ({lendReqs.filter((r) => r.status === "pending").length})</TabsTrigger>
            <TabsTrigger value="onloan" className="gap-1.5"><ClipboardList className="h-4 w-4" />ציוד מושאל</TabsTrigger>
            <TabsTrigger value="itemreq" className="gap-1.5"><Package className="h-4 w-4" />בקשות פריטים ({itemReqs.length})</TabsTrigger>
            <TabsTrigger value="colors" className="gap-1.5"><Palette className="h-4 w-4" />צבעי פילמנט</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5"><Users className="h-4 w-4" />משתמשים ({users.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="sources">
            <ItemSourcesManager />
          </TabsContent>

          <TabsContent value="catalog">
            <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
              <form onSubmit={addItem} className="space-y-4 rounded-2xl border border-border bg-card p-6 h-fit">
                <h2 className="text-lg font-bold">הוספת פריט</h2>
                <div><Label>שם הפריט</Label><Input value={iName} onChange={(e) => setIName(e.target.value)} required /></div>
                <div><Label>תיאור</Label><Textarea value={iDesc} onChange={(e) => setIDesc(e.target.value)} rows={2} /></div>
                <div>
                  <Label>קטגוריה</Label>
                  <select value={iCategory} onChange={(e) => setICategory(e.target.value as CatalogCategory)} className="block h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
                <div><Label>כמות</Label><Input type="number" min={1} value={iQty} onChange={(e) => setIQty(parseInt(e.target.value) || 1)} required /></div>
                <div className="space-y-2 rounded-md border border-border bg-background/50 p-3">
                  <Label>מיקום אחסון <span className="text-xs font-normal text-muted-foreground">(אופציונלי)</span></Label>
                  {!iCreatingSource ? (
                    <>
                      <select
                        value={iSourceId}
                        onChange={(e) => setISourceId(e.target.value)}
                        className="block h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="">— ללא מקור —</option>
                        {sourcesList.filter((s) => s.is_active).map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => { setICreatingSource(true); setISourceId(""); }}
                        className="text-xs text-primary hover:underline"
                      >+ צור מקור חדש</button>
                    </>
                  ) : (
                    <>
                      <Input
                        placeholder="שם מקור חדש (לדוגמה: מגירה 4)"
                        value={iNewSourceName}
                        onChange={(e) => setINewSourceName(e.target.value)}
                        className="h-9"
                      />
                      <button
                        type="button"
                        onClick={() => { setICreatingSource(false); setINewSourceName(""); }}
                        className="text-xs text-muted-foreground hover:underline"
                      >ביטול</button>
                    </>
                  )}
                  <p className="text-[11px] text-muted-foreground">ניתן להוסיף מיקומים נוספים לאחר היצירה דרך כפתור עריכה.</p>
                </div>
                <div><Label>תמונה</Label><input id="img-input" type="file" accept="image/*" onChange={(e) => setIImage(e.target.files?.[0] ?? null)} className="block w-full text-sm" /></div>
                <Button type="submit" disabled={iSubmitting} className="w-full gap-1.5"><Plus className="h-4 w-4" />{iSubmitting ? "מוסיף..." : "הוסף לקטלוג"}</Button>
              </form>

              <div>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">כלי קטלוג</p>
                  <h2 className="mt-1 text-lg font-bold">ניהול מרוכז דרך CSV</h2>
                  <p className="text-sm text-muted-foreground">ייצוא, ייבוא והורדת תבנית לעריכה ב-Excel או Google Sheets.</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" className="gap-1.5" asChild>
                      <label className="cursor-pointer">
                        <Upload className="h-3.5 w-3.5" />העלה CSV
                        <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvUpload} />
                      </label>
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={downloadCsvFormat}>
                      <FileDown className="h-3.5 w-3.5" />הורד תבנית
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={downloadCsvCatalog} disabled={!items.length}>
                      <Download className="h-3.5 w-3.5" />הורד קטלוג נוכחי
                    </Button>
                  </div>

                  <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                    <li><strong className="text-foreground">העלה CSV:</strong> מוסיף פריטים חדשים בלבד מהקובץ. לא מוחק ולא מעדכן פריטים קיימים.</li>
                    <li><strong className="text-foreground">הורד תבנית:</strong> קובץ ריק עם כותרות העמודות ושורת דוגמה.</li>
                    <li><strong className="text-foreground">הורד קטלוג נוכחי:</strong> ייצוא של כל הפריטים הקיימים ({items.length}) לקובץ CSV.</li>
                  </ul>
                </div>

                <div className="mb-4 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
                  <h2 className="text-xl font-bold">
                    פריטים קיימים <span className="text-muted-foreground">({items.length})</span>
                  </h2>
                  <div className="inline-flex rounded-md border border-border bg-background p-0.5">
                    <button
                      type="button"
                      onClick={() => setCatalogView("cards")}
                      className={`rounded px-3 py-1 text-xs font-medium transition ${catalogView === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >כרטיסים</button>
                    <button
                      type="button"
                      onClick={() => setCatalogView("table")}
                      className={`rounded px-3 py-1 text-xs font-medium transition ${catalogView === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >טבלה</button>
                  </div>
                </div>
                {catalogView === "table" ? (
                  <CatalogTableView
                    items={items}
                    onEdit={openEdit}
                    onDelete={deleteItem}
                    onChanged={loadAll}
                  />
                ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3 rounded-lg border border-border bg-card p-3">
                      {item.image_url && <img src={item.image_url} alt={item.name} className="h-20 w-20 shrink-0 rounded object-cover" />}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="min-w-0 flex-1 break-words font-semibold">{item.name}</h3>
                          <div className="flex shrink-0 gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)} aria-label="ערוך"><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteItem(item.id)} aria-label="מחק"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                        <Badge variant="secondary" className="mt-1 w-fit text-[10px]">{CATEGORY_LABELS[normalizeCategory(item.category)]}</Badge>
                        {item.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
                        <p className="mt-2 text-xs text-muted-foreground">
                          זמין: <strong className="text-foreground">{item.quantity_available}</strong> / סה״כ: <strong className="text-foreground">{item.quantity_total}</strong>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="print">
            {(() => {
              const PRINT_STATUSES = [
                { value: "pending", label: "ממתין" },
                { value: "printing", label: "מדפיס" },
                { value: "ready", label: "מוכן לאיסוף" },
                { value: "completed", label: "הושלם" },
                { value: "rejected", label: "נדחה" },
                { value: "cancelled", label: "בוטל" },
              ];
              const filtered = printStatusFilter === "all"
                ? printReqs
                : printReqs.filter((r) => r.status === printStatusFilter);
              return (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">סינון לפי סטטוס:</span>
                    <Button size="sm" variant={printStatusFilter === "all" ? "default" : "outline"} onClick={() => setPrintStatusFilter("all")}>
                      הכל ({printReqs.length})
                    </Button>
                    {PRINT_STATUSES.map((s) => {
                      const count = printReqs.filter((r) => r.status === s.value).length;
                      return (
                        <Button key={s.value} size="sm" variant={printStatusFilter === s.value ? "default" : "outline"} onClick={() => setPrintStatusFilter(s.value)}>
                          {s.label} ({count})
                        </Button>
                      );
                    })}
                  </div>
                  {filtered.length === 0 && <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">אין בקשות</p>}
                  {filtered.map((r) => (
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
                          <option value="cancelled">בוטל</option>
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
              );
            })()}
          </TabsContent>

          <TabsContent value="lend">
            {(() => {
              const LEND_STATUSES = [
                { value: "pending", label: "ממתין" },
                { value: "approved", label: "אושר" },
                { value: "delivered", label: "נמסר" },
                { value: "returned", label: "הוחזר" },
                { value: "rejected", label: "נדחה" },
                { value: "cancelled", label: "בוטל" },
              ];
              const filtered = lendStatusFilter === "all"
                ? lendReqs
                : lendReqs.filter((r) => r.status === lendStatusFilter);
              return (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">סינון לפי סטטוס:</span>
                    <Button size="sm" variant={lendStatusFilter === "all" ? "default" : "outline"} onClick={() => setLendStatusFilter("all")}>
                      הכל ({lendReqs.length})
                    </Button>
                    {LEND_STATUSES.map((s) => {
                      const count = lendReqs.filter((r) => r.status === s.value).length;
                      return (
                        <Button key={s.value} size="sm" variant={lendStatusFilter === s.value ? "default" : "outline"} onClick={() => setLendStatusFilter(s.value)}>
                          {s.label} ({count})
                        </Button>
                      );
                    })}
                  </div>
                  {filtered.length === 0 && <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">אין בקשות</p>}
                  {filtered.map((r) => (
                    <div key={r.id} className="rounded-lg border border-border bg-card p-5">
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold">{r.requester_name}</h3>
                          <p className="text-xs text-muted-foreground">{r.requester_email} · {r.requester_phone} · {new Date(r.created_at).toLocaleDateString("he-IL")}</p>
                        </div>
                        <select value={r.status} onChange={async (e) => {
                          const next = e.target.value;
                          if (next === "delivered" && r.status !== "delivered") {
                            setDeliverFor(r);
                            return;
                          }
                          if (next === "returned" && r.status !== "returned") {
                            const { error } = await supabase.functions.invoke("return-lend-request", { body: { request_id: r.id } });
                            if (error) toast.error(error.message);
                            else { toast.success("הוחזר"); loadAll(); }
                            return;
                          }
                          updateLendStatus(r.id, { status: next });
                        }} className="rounded-md border border-border bg-background px-2 py-1 text-sm">
                          <option value="pending">ממתין</option>
                          <option value="approved">אושר</option>
                          <option value="delivered">נמסר</option>
                          <option value="returned">הוחזר</option>
                          <option value="rejected">נדחה</option>
                          <option value="cancelled">בוטל</option>
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
              );
            })()}
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
                                  onClick={async () => {
                                    const { error } = await supabase.functions.invoke("return-lend-request", { body: { request_id: r.id } });
                                    if (error) toast.error(error.message);
                                    else { toast.success("הוחזר"); loadAll(); }
                                  }}
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

          <TabsContent value="itemreq">
            <div className="space-y-3">
              {itemReqs.length === 0 && <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">אין בקשות לפריטים חדשים</p>}
              {itemReqs.map((r) => (
                <div key={r.id} className="rounded-lg border border-border bg-card p-5">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{r.item_name}</h3>
                      <p className="text-xs text-muted-foreground">{r.requester_name} · {r.requester_email} · {r.requester_phone} · {new Date(r.created_at).toLocaleDateString("he-IL")}</p>
                    </div>
                    <select
                      value={r.status}
                      onChange={async (e) => {
                        const { error } = await supabase.from("item_requests").update({ status: e.target.value }).eq("id", r.id);
                        if (error) toast.error(error.message); else { toast.success("עודכן"); loadAll(); }
                      }}
                      className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                    >
                      <option value="pending">ממתין</option>
                      <option value="approved">אושר</option>
                      <option value="ordered">הוזמן</option>
                      <option value="received">הגיע</option>
                      <option value="rejected">נדחה</option>
                    </select>
                  </div>
                  {r.description && <p className="text-sm whitespace-pre-wrap"><strong>תיאור:</strong> {r.description}</p>}
                  {r.reference_link && (
                    <a href={r.reference_link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-primary underline">
                      קישור לפריט
                    </a>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="colors">
            <FilamentColorsManager />
          </TabsContent>

          <TabsContent value="users">
            {(() => {
              const q = userSearch.trim().toLowerCase();
              const filteredUsers = q
                ? users.filter((u) =>
                    (u.full_name ?? "").toLowerCase().includes(q) ||
                    (u.email ?? "").toLowerCase().includes(q) ||
                    (u.phone ?? "").toLowerCase().includes(q)
                  )
                : users;
              return (
                <div>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="relative max-w-sm flex-1">
                      <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="חיפוש לפי שם, אימייל או טלפון..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pr-9"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">{filteredUsers.length} מתוך {users.length}</p>
                  </div>

                  {filteredUsers.length === 0 ? (
                    <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">אין משתמשים</p>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-border bg-card">
                      <table className="w-full text-sm">
                        <thead className="border-b border-border bg-muted/50 text-right">
                          <tr>
                            <th className="p-3 font-semibold">שם</th>
                            <th className="p-3 font-semibold">אימייל</th>
                            <th className="p-3 font-semibold">טלפון</th>
                            <th className="p-3 font-semibold">תפקיד</th>
                            <th className="p-3 font-semibold">הצטרף</th>
                            <th className="p-3 font-semibold">פעולה</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((u) => (
                            <tr key={u.id} className="border-b border-border last:border-0">
                              <td className="p-3 font-medium">{u.full_name ?? "—"}</td>
                              <td className="p-3 text-xs text-muted-foreground">{u.email ?? "—"}</td>
                              <td className="p-3 text-xs text-muted-foreground">{u.phone ?? "—"}</td>
                              <td className="p-3">
                                <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                                  {u.role === "admin" ? "מנהל" : "משתמש"}
                                </Badge>
                              </td>
                              <td className="p-3 text-xs">{new Date(u.created_at).toLocaleDateString("he-IL")}</td>
                              <td className="p-3">
                                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCreateLendFor(u)}>
                                  <Plus className="h-3.5 w-3.5" />צור השאלה
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

        <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader><DialogTitle>עריכת פריט</DialogTitle></DialogHeader>
            {editItem && (
              <form onSubmit={saveEdit} className="space-y-3">
                {(eImage || editItem.image_url) && (
                  <img
                    src={eImage ? URL.createObjectURL(eImage) : editItem.image_url!}
                    alt={eName}
                    className="mx-auto h-32 rounded-md object-contain bg-muted p-2"
                  />
                )}
                <div><Label>שם</Label><Input value={eName} onChange={(e) => setEName(e.target.value)} required /></div>
                <div><Label>תיאור</Label><Textarea value={eDesc} onChange={(e) => setEDesc(e.target.value)} rows={3} /></div>
                <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                  סה״כ: <strong className="text-foreground">{editItem.quantity_total}</strong> · זמין: <strong className="text-foreground">{editItem.quantity_available}</strong>
                  <span className="block mt-0.5">הכמויות מתעדכנות אוטומטית לפי מיקומי האחסון למטה</span>
                </div>
                <ItemSourcesEditor itemId={editItem.id} onChanged={loadAll} />
                <div>
                  <Label>קטגוריה</Label>
                  <select value={eCategory} onChange={(e) => setECategory(e.target.value as CatalogCategory)} className="block h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
                <div><Label>החלפת תמונה</Label><input type="file" accept="image/*" onChange={(e) => setEImage(e.target.files?.[0] ?? null)} className="block w-full text-sm" /></div>
                <DialogFooter className="gap-2 sm:justify-start">
                  <Button type="submit" disabled={eSubmitting}>{eSubmitting ? "שומר..." : "שמור"}</Button>
                  <Button type="button" variant="outline" onClick={() => setEditItem(null)}>ביטול</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {deliverFor && (
          <DeliverDialog
            open={!!deliverFor}
            onClose={() => setDeliverFor(null)}
            requestId={deliverFor.id}
            items={deliverFor.lend_request_items.map((li) => ({
              id: li.id,
              item_id: li.item_id,
              quantity: li.quantity,
              name: li.catalog_items?.name ?? "",
            }))}
            onDelivered={loadAll}
          />
        )}

        <CreateLendForUser
          open={!!createLendFor}
          onClose={() => setCreateLendFor(null)}
          user={createLendFor}
          onCreated={loadAll}
        />
      </main>
    </div>
  );
};

export default Admin;
