import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { CATEGORIES, CATEGORY_LABELS, normalizeCategory, type CatalogCategory } from "@/lib/categories";

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  quantity_total: number;
  quantity_available: number;
  category: string;
}

interface Source { id: string; name: string; is_active: boolean; }
interface CISRow { id: string; item_id: string; source_id: string; quantity: number; }

interface Props {
  items: CatalogItem[];
  onEdit: (item: CatalogItem) => void;
  onDelete: (id: string) => void;
  onChanged: () => void;
}

/**
 * Spreadsheet-style admin view: edit name / description / category inline,
 * one column per source for per-location quantities, and an extra column to add
 * the item to a new source. Click "ערוך" for the full dialog.
 */
const CatalogTableView = ({ items, onEdit, onDelete, onChanged }: Props) => {
  const [sources, setSources] = useState<Source[]>([]);
  const [cis, setCis] = useState<CISRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "out">("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const [a, b] = await Promise.all([
      supabase.from("item_sources").select("id, name, is_active").order("sort_order").order("name"),
      supabase.from("catalog_item_sources").select("id, item_id, source_id, quantity"),
    ]);
    setSources(((a.data ?? []) as Source[]).filter((s) => s.is_active));
    setCis((b.data ?? []) as CISRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [items.length]);

  // Map item_id -> source_id -> { id, qty }
  const grid = useMemo(() => {
    const m = new Map<string, Map<string, { id: string; qty: number }>>();
    for (const r of cis) {
      if (!m.has(r.item_id)) m.set(r.item_id, new Map());
      m.get(r.item_id)!.set(r.source_id, { id: r.id, qty: r.quantity });
    }
    return m;
  }, [cis]);

  const updateField = async (id: string, field: "name" | "description" | "category", value: string) => {
    const patch = { [field]: value } as Partial<CatalogItem>;
    const { error } = await supabase.from("catalog_items").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else onChanged();
  };

  const setSourceQty = async (itemId: string, sourceId: string, qty: number) => {
    const existing = grid.get(itemId)?.get(sourceId);
    qty = Math.max(0, qty);
    if (existing) {
      const { error } = await supabase
        .from("catalog_item_sources").update({ quantity: qty }).eq("id", existing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      if (qty === 0) return;
      const { error } = await supabase
        .from("catalog_item_sources").insert({ item_id: itemId, source_id: sourceId, quantity: qty });
      if (error) { toast.error(error.message); return; }
    }
    await load();
    onChanged();
  };

  if (loading && sources.length === 0) {
    return <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">טוען…</p>;
  }

  return (
    <div className="max-h-[70vh] overflow-auto rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 border-b border-border bg-muted text-xs uppercase text-muted-foreground shadow-sm">
          <tr>
            <th className="p-2 text-right font-medium">תמונה</th>
            <th className="p-2 text-right font-medium min-w-[160px]">שם</th>
            <th className="p-2 text-right font-medium min-w-[200px]">תיאור</th>
            <th className="p-2 text-right font-medium">קטגוריה</th>
            <th className="p-2 text-right font-medium">סה״כ</th>
            <th className="p-2 text-right font-medium">זמין</th>
            {sources.map((s) => (
              <th key={s.id} className="p-2 text-right font-medium" title={s.name}>{s.name}</th>
            ))}
            <th className="p-2 text-right font-medium">פעולות</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20">
              <td className="p-2">
                {item.image_url
                  ? <img src={item.image_url} alt={item.name} className="h-10 w-10 rounded object-cover" />
                  : <div className="h-10 w-10 rounded bg-muted" />}
              </td>
              <td className="p-2">
                <Input
                  defaultValue={item.name}
                  onBlur={(e) => e.target.value !== item.name && updateField(item.id, "name", e.target.value)}
                  className="h-8"
                />
              </td>
              <td className="p-2">
                <Input
                  defaultValue={item.description ?? ""}
                  onBlur={(e) => (e.target.value !== (item.description ?? "")) && updateField(item.id, "description", e.target.value)}
                  className="h-8"
                  placeholder="—"
                />
              </td>
              <td className="p-2">
                <select
                  defaultValue={normalizeCategory(item.category)}
                  onChange={(e) => updateField(item.id, "category", e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c as CatalogCategory]}</option>)}
                </select>
              </td>
              <td className="p-2">
                <Badge variant="secondary" className="text-xs">{item.quantity_total}</Badge>
              </td>
              <td className="p-2">
                <Badge variant={item.quantity_available > 0 ? "default" : "destructive"} className="text-xs">
                  {item.quantity_available}
                </Badge>
              </td>
              {sources.map((s) => {
                const cell = grid.get(item.id)?.get(s.id);
                return (
                  <td key={s.id} className="p-2">
                    <Input
                      type="number"
                      min={0}
                      defaultValue={cell?.qty ?? ""}
                      placeholder={cell ? "0" : "+"}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value);
                        const newQty = isNaN(v) ? 0 : v;
                        const oldQty = cell?.qty ?? 0;
                        if (newQty !== oldQty) setSourceQty(item.id, s.id, newQty);
                      }}
                      className="h-8 w-16"
                    />
                  </td>
                );
              })}
              <td className="p-2">
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(item)} aria-label="ערוך">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(item.id)} aria-label="מחק">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={7 + sources.length} className="p-8 text-center text-sm text-muted-foreground">אין פריטים</td></tr>
          )}
        </tbody>
      </table>
      {sources.length === 0 && (
        <p className="border-t border-border p-3 text-center text-xs text-muted-foreground">
          <Plus className="ml-1 inline h-3 w-3" />
          הוסף מיקומי אחסון בלשונית "מקורות" כדי לקבל עמודה לכל מקור
        </p>
      )}
    </div>
  );
};

export default CatalogTableView;
