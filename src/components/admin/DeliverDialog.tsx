import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface LendItem {
  id: string;          // lend_request_items.id
  item_id: string;
  quantity: number;
  name: string;
}
interface Source { id: string; name: string; is_active: boolean; }
interface Stock { source_id: string; quantity: number; }
interface Pick { source_id: string; quantity: number; }

interface Props {
  open: boolean;
  onClose: () => void;
  requestId: string;
  items: LendItem[];
  onDelivered: () => void;
}

const DeliverDialog = ({ open, onClose, requestId, items, onDelivered }: Props) => {
  const [sources, setSources] = useState<Source[]>([]);
  const [stock, setStock] = useState<Record<string, Stock[]>>({}); // by item_id
  const [picks, setPicks] = useState<Record<string, Pick[]>>({});  // by lend_request_item_id
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: srcs } = await supabase
        .from("item_sources").select("id, name, is_active").order("sort_order").order("name");
      setSources((srcs ?? []) as Source[]);

      const itemIds = items.map((i) => i.item_id);
      const { data: cis } = await supabase
        .from("catalog_item_sources")
        .select("item_id, source_id, quantity")
        .in("item_id", itemIds.length ? itemIds : ["00000000-0000-0000-0000-000000000000"]);
      const map: Record<string, Stock[]> = {};
      (cis ?? []).forEach((r: any) => {
        (map[r.item_id] ??= []).push({ source_id: r.source_id, quantity: r.quantity });
      });
      setStock(map);

      // Initial picks: try to auto-fill from a single source if possible
      const init: Record<string, Pick[]> = {};
      items.forEach((it) => {
        const available = (map[it.item_id] ?? []).filter((s) => s.quantity > 0);
        const single = available.find((s) => s.quantity >= it.quantity);
        if (single) init[it.id] = [{ source_id: single.source_id, quantity: it.quantity }];
        else init[it.id] = [{ source_id: "", quantity: it.quantity }];
      });
      setPicks(init);
    })();
  }, [open, requestId]);

  const updatePick = (lriId: string, idx: number, patch: Partial<Pick>) => {
    setPicks((p) => ({
      ...p,
      [lriId]: p[lriId].map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    }));
  };
  const addPickRow = (lriId: string) => {
    setPicks((p) => ({ ...p, [lriId]: [...p[lriId], { source_id: "", quantity: 0 }] }));
  };
  const removePickRow = (lriId: string, idx: number) => {
    setPicks((p) => ({ ...p, [lriId]: p[lriId].filter((_, i) => i !== idx) }));
  };

  const submit = async () => {
    // Validate
    for (const it of items) {
      const rows = picks[it.id] ?? [];
      const sum = rows.reduce((s, r) => s + (r.quantity || 0), 0);
      if (sum !== it.quantity) {
        toast.error(`${it.name}: נדרש ${it.quantity}, נבחר ${sum}`);
        return;
      }
      for (const r of rows) {
        if (r.quantity > 0 && !r.source_id) {
          toast.error(`${it.name}: יש לבחור מקור`);
          return;
        }
      }
    }
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("deliver-lend-request", {
        body: {
          request_id: requestId,
          items: items.map((it) => ({
            lend_request_item_id: it.id,
            picks: (picks[it.id] ?? []).filter((p) => p.quantity > 0),
          })),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("נמסר בהצלחה");
      onDelivered();
      onClose();
    } catch (e) {
      toast.error("שגיאה במסירה", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>בחירת מקורות למסירה</DialogTitle>
          <DialogDescription>בחר מאיזה מיקום אחסון לקחת כל פריט</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {items.map((it) => {
            const itemStock = stock[it.item_id] ?? [];
            const rows = picks[it.id] ?? [];
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
                        {sources.filter((s) => s.is_active).map((s) => {
                          const stk = itemStock.find((x) => x.source_id === s.id)?.quantity ?? 0;
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
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => removePickRow(it.id, idx)}>
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
          <Button onClick={submit} disabled={submitting}>{submitting ? "מוסר..." : "אשר מסירה"}</Button>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeliverDialog;
