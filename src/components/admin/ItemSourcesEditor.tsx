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
      {available.length > 0 && (
        <div className="flex items-center gap-2 border-t border-border pt-2">
          <select
            value={newSourceId}
            onChange={(e) => setNewSourceId(e.target.value)}
            className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">— בחר מקור —</option>
            {available.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Input type="number" min={0} value={newQty} onChange={(e) => setNewQty(parseInt(e.target.value) || 0)} className="h-8 w-20" />
          <Button type="button" size="sm" onClick={addRow} disabled={!newSourceId} className="gap-1">
            <Plus className="h-3.5 w-3.5" />הוסף
          </Button>
        </div>
      )}
    </div>
  );
};

export default ItemSourcesEditor;
