import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  ensureItemSource, useCatalogItemSources, useItemSources, useRemoveSourceRow, useSetSourceQuantity,
} from "@/lib/queries/admin";
import { errorMessage } from "@/lib/errors";

interface Props {
  itemId: string;
}

/** Per-item storage locations: add/remove sources and edit per-source quantities. */
const ItemSourcesEditor = ({ itemId }: Props) => {
  const { data: sources = [] } = useItemSources();
  const { data: allRows = [] } = useCatalogItemSources();
  const setQuantity = useSetSourceQuantity();
  const removeRow = useRemoveSourceRow();
  const rows = allRows.filter((r) => r.item_id === itemId);
  const [newSourceId, setNewSourceId] = useState<string>("");
  const [newQty, setNewQty] = useState(1);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");

  const usedIds = new Set(rows.map((r) => r.source_id));
  const available = sources.filter((s) => s.is_active && !usedIds.has(s.id));

  const run = async (action: () => Promise<unknown>, success?: string) => {
    try {
      await action();
      if (success) toast.success(success);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const addRow = () => run(async () => {
    if (!newSourceId || newQty < 0) return;
    await setQuantity.mutateAsync({ itemId, sourceId: newSourceId, quantity: newQty });
    setNewSourceId(""); setNewQty(1);
  });

  const createAndAddNew = () => run(async () => {
    const name = newSourceName.trim();
    if (!name) return;
    const sourceId = await ensureItemSource(name);
    const existing = rows.find((r) => r.source_id === sourceId);
    await setQuantity.mutateAsync({ itemId, sourceId, quantity: newQty, existingId: existing?.id });
    setNewSourceName(""); setNewQty(1); setCreatingNew(false);
  }, "מקור נוסף");

  /** Saves a quantity edit when the field loses focus (not on every keystroke). */
  const commitQty = (rowId: string, oldQty: number, raw: string) => {
    const qty = parseInt(raw, 10);
    if (Number.isNaN(qty) || qty < 0 || qty === oldQty) return;
    run(() => setQuantity.mutateAsync({ itemId, sourceId: "", quantity: qty, existingId: rowId }));
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
              // Re-mount when the stored value changes so the field shows the saved quantity.
              key={`${r.id}-${r.quantity}`}
              type="number" min={0}
              defaultValue={r.quantity}
              onBlur={(e) => commitQty(r.id, r.quantity, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
              className="h-8 w-20"
              aria-label={`כמות ב${s?.name ?? "מקור"}`}
            />
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => run(() => removeRow.mutateAsync(r.id))} aria-label="הסר מקור">
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
