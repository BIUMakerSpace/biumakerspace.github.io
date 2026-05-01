import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface Source { id: string; name: string; is_active: boolean; }
interface Row { id?: string; source_id: string; quantity: number; }

interface Props {
  itemId: string;
  onChanged?: () => void;
}

/**
 * Per-item storage location editor.
 * Loads catalog_item_sources rows for the item and lets admin add/remove/edit them.
 * Saves changes immediately on each action.
 */
const ItemSourcesEditor = ({ itemId, onChanged }: Props) => {
  const [sources, setSources] = useState<Source[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [newSourceId, setNewSourceId] = useState<string>("");
  const [newQty, setNewQty] = useState(1);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");

  const load = async () => {
    const [a, b] = await Promise.all([
      supabase.from("item_sources").select("id, name, is_active").order("sort_order").order("name"),
      supabase.from("catalog_item_sources").select("id, source_id, quantity").eq("item_id", itemId),
    ]);
    setSources((a.data ?? []) as Source[]);
    setRows((b.data ?? []) as Row[]);
  };
  useEffect(() => { load(); }, [itemId]);

  const usedIds = new Set(rows.map((r) => r.source_id));
  const available = sources.filter((s) => s.is_active && !usedIds.has(s.id));

  const addRow = async () => {
    if (!newSourceId || newQty < 0) return;
    const { error } = await supabase
      .from("catalog_item_sources")
      .insert({ item_id: itemId, source_id: newSourceId, quantity: newQty });
    if (error) toast.error(error.message);
    else { setNewSourceId(""); setNewQty(1); await load(); onChanged?.(); }
  };
  const updateQty = async (rowId: string, qty: number) => {
    const { error } = await supabase
      .from("catalog_item_sources")
      .update({ quantity: Math.max(0, qty) })
      .eq("id", rowId);
    if (error) toast.error(error.message);
    else { await load(); onChanged?.(); }
  };
  const removeRow = async (rowId: string) => {
    const { error } = await supabase.from("catalog_item_sources").delete().eq("id", rowId);
    if (error) toast.error(error.message);
    else { await load(); onChanged?.(); }
  };
  const createAndAddNew = async () => {
    const name = newSourceName.trim();
    if (!name) return;
    // Reuse if a source with this name already exists (case-insensitive)
    const existing = sources.find((s) => s.name.trim().toLowerCase() === name.toLowerCase());
    let sourceId = existing?.id;
    if (!sourceId) {
      const { data, error } = await supabase
        .from("item_sources")
        .insert({ name })
        .select("id")
        .single();
      if (error) { toast.error(error.message); return; }
      sourceId = data.id;
    }
    const { error: e2 } = await supabase
      .from("catalog_item_sources")
      .insert({ item_id: itemId, source_id: sourceId, quantity: Math.max(0, newQty) });
    if (e2) { toast.error(e2.message); return; }
    toast.success("מקור נוסף");
    setNewSourceName(""); setNewQty(1); setCreatingNew(false);
    await load(); onChanged?.();
  };

  const total = rows.reduce((s, r) => s + r.quantity, 0);

  return (
    <div className="space-y-2">
      <Label>מיקומי אחסון <span className="text-xs text-muted-foreground">(סה״כ: {total})</span></Label>
      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground">אין עדיין מיקומים — הוסף מקור למטה</p>
      )}
      {rows.map((r) => {
        const s = sources.find((x) => x.id === r.source_id);
        return (
          <div key={r.id} className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
            <span className="flex-1 text-sm font-medium">{s?.name ?? "מקור לא ידוע"}</span>
            <Input
              type="number" min={0}
              value={r.quantity}
              onChange={(e) => updateQty(r.id!, parseInt(e.target.value) || 0)}
              className="h-8 w-20"
            />
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeRow(r.id!)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
      <div className="space-y-2 border-t border-border pt-2">
        {!creatingNew ? (
          <div className="flex items-center gap-2">
            <select
              value={newSourceId}
              onChange={(e) => setNewSourceId(e.target.value)}
              className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
              disabled={available.length === 0}
            >
              <option value="">{available.length === 0 ? "— אין מקורות זמינים —" : "— בחר מקור —"}</option>
              {available.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <Input type="number" min={0} value={newQty} onChange={(e) => setNewQty(parseInt(e.target.value) || 0)} className="h-8 w-20" />
            <Button type="button" size="sm" onClick={addRow} disabled={!newSourceId} className="gap-1">
              <Plus className="h-3.5 w-3.5" />הוסף
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              placeholder="שם מקור חדש (לדוגמה: מגירה 4)"
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              className="h-8 flex-1"
              autoFocus
            />
            <Input type="number" min={0} value={newQty} onChange={(e) => setNewQty(parseInt(e.target.value) || 0)} className="h-8 w-20" />
            <Button type="button" size="sm" onClick={createAndAddNew} disabled={!newSourceName.trim()} className="gap-1">
              <Plus className="h-3.5 w-3.5" />צור והוסף
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setCreatingNew(false); setNewSourceName(""); }}>
              ביטול
            </Button>
          </div>
        )}
        {!creatingNew && (
          <button
            type="button"
            onClick={() => { setCreatingNew(true); setNewSourceId(""); }}
            className="text-xs text-primary hover:underline"
          >
            + צור מקור חדש
          </button>
        )}
      </div>
    </div>
  );
};

export default ItemSourcesEditor;
