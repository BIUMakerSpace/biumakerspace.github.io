import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ConfirmButton from "@/components/ConfirmButton";
import CatalogTableView from "@/components/admin/CatalogTableView";
import ItemSourcesEditor from "@/components/admin/ItemSourcesEditor";
import { Download, FileDown, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { CATEGORIES, CATEGORY_LABELS, normalizeCategory, type CatalogCategory } from "@/lib/categories";
import { CATALOG_CSV_HEADERS, downloadText, parseCatalogCsv, toCsv } from "@/lib/csv";
import { useCatalogItems } from "@/lib/queries/catalog";
import {
  ensureItemSource, useAddCatalogItems, useItemSources, useRemoveCatalogItem, useUpdateCatalogItem, type CatalogItem,
} from "@/lib/queries/admin";
import { IMAGE_ACCEPT, validateImage } from "@/lib/storage";
import { errorMessage } from "@/lib/errors";

const CategorySelect = ({ value, onChange }: { value: CatalogCategory; onChange: (c: CatalogCategory) => void }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value as CatalogCategory)}
    className="block h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
  >
    {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
  </select>
);

/** Object URL for a local file preview, revoked when the file changes or on unmount. */
function useObjectUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return url;
}

const AddItemForm = () => {
  const { data: sources = [] } = useItemSources();
  const addItems = useAddCatalogItems();
  const imageInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState(1);
  const [category, setCategory] = useState<CatalogCategory>("other");
  const [image, setImage] = useState<File | null>(null);
  const [sourceId, setSourceId] = useState("");
  const [newSourceName, setNewSourceName] = useState("");
  const [creatingSource, setCreatingSource] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const imageError = image && validateImage(image);
    if (imageError) { toast.error(imageError); return; }
    try {
      const resolvedSourceId = sourceId || (newSourceName.trim() ? await ensureItemSource(newSourceName) : null);
      await addItems.mutateAsync({
        items: [{ name, description: desc || null, category, quantity: qty, source_id: resolvedSourceId }],
        image,
      });
      toast.success("פריט נוסף");
      setName(""); setDesc(""); setQty(1); setCategory("other"); setImage(null);
      setSourceId(""); setNewSourceName(""); setCreatingSource(false);
      if (imageInput.current) imageInput.current.value = "";
    } catch (err) {
      toast.error("שגיאה", { description: errorMessage(err) });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6 h-fit">
      <h2 className="text-lg font-bold">הוספת פריט</h2>
      <div><Label htmlFor="new-item-name">שם הפריט</Label><Input id="new-item-name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div><Label htmlFor="new-item-desc">תיאור</Label><Textarea id="new-item-desc" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} /></div>
      <div><Label>קטגוריה</Label><CategorySelect value={category} onChange={setCategory} /></div>
      <div><Label htmlFor="new-item-qty">כמות</Label><Input id="new-item-qty" type="number" min={1} value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)} required /></div>
      <div className="space-y-2 rounded-md border border-border bg-background/50 p-3">
        <Label>מיקום אחסון <span className="text-xs font-normal text-muted-foreground">(אופציונלי)</span></Label>
        {!creatingSource ? (
          <>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="block h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">— ללא מקור (כללי) —</option>
              {sources.filter((s) => s.is_active).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => { setCreatingSource(true); setSourceId(""); }}
              className="text-xs text-primary hover:underline"
            >+ צור מקור חדש</button>
          </>
        ) : (
          <>
            <Input
              placeholder="שם מקור חדש (לדוגמה: מגירה 4)"
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              className="h-9"
            />
            <button
              type="button"
              onClick={() => { setCreatingSource(false); setNewSourceName(""); }}
              className="text-xs text-muted-foreground hover:underline"
            >ביטול</button>
          </>
        )}
        <p className="text-[11px] text-muted-foreground">ניתן להוסיף מיקומים נוספים לאחר היצירה דרך כפתור עריכה.</p>
      </div>
      <div>
        <Label htmlFor="new-item-image">תמונה</Label>
        <input ref={imageInput} id="new-item-image" type="file" accept={IMAGE_ACCEPT} onChange={(e) => setImage(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
      </div>
      <Button type="submit" disabled={addItems.isPending} className="w-full gap-1.5"><Plus className="h-4 w-4" />{addItems.isPending ? "מוסיף..." : "הוסף לקטלוג"}</Button>
    </form>
  );
};

const CsvTools = ({ items }: { items: CatalogItem[] }) => {
  const addItems = useAddCatalogItems();

  const downloadTemplate = () =>
    downloadText(toCsv([CATALOG_CSV_HEADERS, ["דוגמה: מברג", "תיאור הפריט", "tools", 5, 5, ""]]), "catalog-template.csv");

  const downloadCatalog = () =>
    downloadText(
      toCsv([
        CATALOG_CSV_HEADERS,
        ...items.map((it) => [it.name, it.description ?? "", normalizeCategory(it.category), it.quantity_total, it.quantity_available, it.image_url ?? ""]),
      ]),
      "catalog-export.csv",
    );

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const records = parseCatalogCsv(await file.text());
      await addItems.mutateAsync({ items: records });
      toast.success(`נוספו ${records.length} פריטים`);
    } catch (err) {
      toast.error("שגיאה", { description: errorMessage(err) });
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">כלי קטלוג</p>
      <h2 className="mt-1 text-lg font-bold">ניהול מרוכז דרך CSV</h2>
      <p className="text-sm text-muted-foreground">ייצוא, ייבוא והורדת תבנית לעריכה ב-Excel או Google Sheets.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" className="gap-1.5" asChild>
          <label className="cursor-pointer">
            <Upload className="h-3.5 w-3.5" />העלה CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={upload} />
          </label>
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={downloadTemplate}>
          <FileDown className="h-3.5 w-3.5" />הורד תבנית
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={downloadCatalog} disabled={!items.length}>
          <Download className="h-3.5 w-3.5" />הורד קטלוג נוכחי
        </Button>
      </div>

      <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
        <li><strong className="text-foreground">העלה CSV:</strong> מוסיף פריטים חדשים בלבד מהקובץ. לא מוחק ולא מעדכן פריטים קיימים. המלאי נרשם במקור "כללי".</li>
        <li><strong className="text-foreground">הורד תבנית:</strong> קובץ ריק עם כותרות העמודות ושורת דוגמה.</li>
        <li><strong className="text-foreground">הורד קטלוג נוכחי:</strong> ייצוא של כל הפריטים הקיימים ({items.length}) לקובץ CSV.</li>
      </ul>
    </div>
  );
};

const EditItemDialog = ({ item, onClose }: { item: CatalogItem; onClose: () => void }) => {
  const updateItem = useUpdateCatalogItem();
  const [name, setName] = useState(item.name);
  const [desc, setDesc] = useState(item.description ?? "");
  const [category, setCategory] = useState<CatalogCategory>(normalizeCategory(item.category));
  const [image, setImage] = useState<File | null>(null);
  const preview = useObjectUrl(image);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const imageError = image && validateImage(image);
    if (imageError) { toast.error(imageError); return; }
    try {
      await updateItem.mutateAsync({ item, patch: { name, description: desc || null, category }, newImage: image });
      toast.success("הפריט עודכן");
      onClose();
    } catch (err) {
      toast.error("שגיאה", { description: errorMessage(err) });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>עריכת פריט</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          {(preview || item.image_url) && (
            <img src={preview ?? item.image_url ?? undefined} alt={name} className="mx-auto h-32 rounded-md object-contain bg-muted p-2" />
          )}
          <div><Label htmlFor="edit-item-name">שם</Label><Input id="edit-item-name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label htmlFor="edit-item-desc">תיאור</Label><Textarea id="edit-item-desc" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} /></div>
          <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
            סה״כ: <strong className="text-foreground">{item.quantity_total}</strong> · זמין: <strong className="text-foreground">{item.quantity_available}</strong>
            <span className="block mt-0.5">הכמויות מתעדכנות אוטומטית לפי מיקומי האחסון למטה</span>
          </div>
          <ItemSourcesEditor itemId={item.id} />
          <div><Label>קטגוריה</Label><CategorySelect value={category} onChange={setCategory} /></div>
          <div>
            <Label htmlFor="edit-item-image">החלפת תמונה</Label>
            <input id="edit-item-image" type="file" accept={IMAGE_ACCEPT} onChange={(e) => setImage(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button type="submit" disabled={updateItem.isPending}>{updateItem.isPending ? "שומר..." : "שמור"}</Button>
            <Button type="button" variant="outline" onClick={onClose}>ביטול</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const CatalogTab = () => {
  const { data: items = [] } = useCatalogItems();
  const removeItem = useRemoveCatalogItem();
  const [view, setView] = useState<"cards" | "table">("cards");
  const [editId, setEditId] = useState<string | null>(null);
  // Look the item up by id so the dialog always shows fresh quantities.
  const editItem = items.find((i) => i.id === editId) ?? null;

  const remove = async (item: CatalogItem) => {
    try {
      const result = await removeItem.mutateAsync(item);
      toast.success(result === "deleted" ? "נמחק" : "לפריט יש היסטוריית השאלות, ולכן הוא הוסתר מהקטלוג במקום להימחק");
    } catch (err) {
      toast.error("שגיאה", { description: errorMessage(err) });
    }
  };

  const deleteButton = (item: CatalogItem) => (
    <ConfirmButton
      title="למחוק פריט זה?"
      description="פריט עם היסטוריית השאלות יוסתר מהקטלוג במקום להימחק."
      confirmLabel="מחק"
      onConfirm={() => remove(item)}
      trigger={<Button size="icon" variant="ghost" className="h-7 w-7" aria-label="מחק"><Trash2 className="h-3.5 w-3.5" /></Button>}
    />
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr] lg:gap-8">
      <AddItemForm />

      <div>
        <CsvTools items={items} />

        <div className="mb-4 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <h2 className="text-xl font-bold">
            פריטים קיימים <span className="text-muted-foreground">({items.length})</span>
          </h2>
          <div className="inline-flex rounded-md border border-border bg-background p-0.5">
            {(["cards", "table"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded px-3 py-1 text-xs font-medium transition ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >{v === "cards" ? "כרטיסים" : "טבלה"}</button>
            ))}
          </div>
        </div>

        {view === "table" ? (
          <CatalogTableView items={items} onEdit={(it) => setEditId(it.id)} onDelete={remove} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3 rounded-lg border border-border bg-card p-3">
                {item.image_url && <img src={item.image_url} alt={item.name} loading="lazy" className="h-20 w-20 shrink-0 rounded object-cover" />}
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 flex-1 break-words font-semibold">{item.name}</h3>
                    <div className="flex shrink-0 gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditId(item.id)} aria-label="ערוך"><Pencil className="h-3.5 w-3.5" /></Button>
                      {deleteButton(item)}
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

      {editItem && <EditItemDialog key={editItem.id} item={editItem} onClose={() => setEditId(null)} />}
    </div>
  );
};

export default CatalogTab;
