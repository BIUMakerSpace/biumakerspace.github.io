import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCatalogItemSources, useDeliverLendRequest, useItemSources } from "@/lib/queries/admin";
import { errorMessage } from "@/lib/errors";

export interface DeliverItem {
  id: string;          // lend_request_items.id
  item_id: string;
  quantity: number;
  name: string;
}
interface Pick { source_id: string; quantity: number; }

interface Props {
  onClose: () => void;
  requestId: string;
  items: DeliverItem[];
  onDelivered: () => void;
}

/** Choose which storage source(s) each lent item is taken from. Mount only while open. */
const DeliverDialog = ({ onClose, requestId, items, onDelivered }: Props) => {
  const { data: sources = [], isLoading: sourcesLoading } = useItemSources();
  const { data: stockRows = [], isLoading: stockLoading } = useCatalogItemSources();
  const deliver = useDeliverLendRequest();
  const activeSources = sources.filter((s) => s.is_active);
  const stockOf = (itemId: string, sourceId: string) =>
    stockRows.find((r) => r.item_id === itemId && r.source_id === sourceId)?.quantity ?? 0;

  // Initial picks: take everything from a single active source when one has enough.
  const [picks, setPicks] = useState<Record<string, Pick[]> | null>(null);
  const loading = sourcesLoading || stockLoading;
  const currentPicks: Record<string, Pick[]> = picks ?? (loading ? {} : Object.fromEntries(items.map((it) => {
    const single = activeSources.find((s) => stockOf(it.item_id, s.id) >= it.quantity);
    return [it.id, [{ source_id: single?.id ?? "", quantity: it.quantity }]];
  })));

  const update = (fn: (p: Record<string, Pick[]>) => Record<string, Pick[]>) => setPicks(fn(currentPicks));
  const updatePick = (lriId: string, idx: number, patch: Partial<Pick>) =>
    update((p) => ({ ...p, [lriId]: p[lriId].map((row, i) => (i === idx ? { ...row, ...patch } : row)) }));
  const addPickRow = (lriId: string) =>
    update((p) => ({ ...p, [lriId]: [...(p[lriId] ?? []), { source_id: "", quantity: 0 }] }));
  const removePickRow = (lriId: string, idx: number) =>
    update((p) => ({ ...p, [lriId]: p[lriId].filter((_, i) => i !== idx) }));

  const submit = async () => {
    for (const it of items) {
      const rows = currentPicks[it.id] ?? [];
      const sum = rows.reduce((s, r) => s + (r.quantity || 0), 0);
      if (sum !== it.quantity) {
        toast.error(`${it.name}: נדרש ${it.quantity}, נבחר ${sum}`);
        return;
      }
      if (rows.some((r) => r.quantity > 0 && !r.source_id)) {
        toast.error(`${it.name}: יש לבחור מקור`);
        return;
      }
    }
    try {
      await deliver.mutateAsync({
        requestId,
        items: items.map((it) => ({
          lend_request_item_id: it.id,
          picks: (currentPicks[it.id] ?? [])
            .filter((p) => p.quantity > 0)
            .map((p) => ({ source_id: p.source_id, quantity: p.quantity })),
        })),
      });
      toast.success("נמסר בהצלחה");
      onDelivered();
      onClose();
    } catch (e) {
      toast.error("שגיאה במסירה", { description: errorMessage(e) });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>בחירת מקורות למסירה</DialogTitle>
          <DialogDescription>בחר מאיזה מיקום אחסון לקחת כל פריט</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {loading && <p className="text-sm text-muted-foreground">טוען...</p>}
          {!loading && items.map((it) => {
            const rows = currentPicks[it.id] ?? [];
            const sum = rows.reduce((s, r) => s + (r.quantity || 0), 0);
            return (
              <div key={it.id} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-semibold">{it.name}</h4>
                  <span className={`text-sm ${sum === it.quantity ? "text-foreground" : "text-destructive"}`}>
                    {sum} / {it.quantity}
                  </span>
                </div>
                <div className="space-y-2">
                  {rows.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={row.source_id}
                        onChange={(e) => updatePick(it.id, idx, { source_id: e.target.value })}
                        className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="">— בחר מקור —</option>
                        {activeSources.map((s) => {
                          const stk = stockOf(it.item_id, s.id);
                          return (
                            <option key={s.id} value={s.id} disabled={stk === 0}>
                              {s.name} (זמין: {stk})
                            </option>
                          );
                        })}
                      </select>
                      <Input
                        type="number" min={0}
                        value={row.quantity}
                        onChange={(e) => updatePick(it.id, idx, { quantity: parseInt(e.target.value) || 0 })}
                        className="h-9 w-20"
                      />
                      {rows.length > 1 && (
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => removePickRow(it.id, idx)} aria-label="הסר מקור">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" size="sm" variant="outline" onClick={() => addPickRow(it.id)} className="gap-1">
                    <Plus className="h-3.5 w-3.5" />הוסף מקור נוסף
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter className="gap-2 sm:justify-start">
          <Button onClick={submit} disabled={deliver.isPending || loading}>{deliver.isPending ? "מוסר..." : "אשר מסירה"}</Button>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeliverDialog;
