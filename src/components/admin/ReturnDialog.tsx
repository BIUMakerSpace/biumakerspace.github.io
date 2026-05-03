import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Source { id: string; name: string; is_active: boolean; }
interface Row {
  id: string;                    // lris.id
  lend_request_item_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  origin_source_id: string;
  origin_source_name: string;
  target_source_id: string;      // editable
}

interface Props {
  open: boolean;
  onClose: () => void;
  requestId: string;
  onReturned: () => void;
}

const ReturnDialog = ({ open, onClose, requestId, onReturned }: Props) => {
  const [sources, setSources] = useState<Source[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data: srcs } = await supabase
        .from("item_sources").select("id, name, is_active").order("sort_order").order("name");
      setSources((srcs ?? []) as Source[]);

      const { data: lris } = await supabase
        .from("lend_request_item_sources")
        .select("id, source_id, quantity, lend_request_item_id, item_sources(name), lend_request_items!inner(item_id, request_id, catalog_items(name))")
        .eq("lend_request_items.request_id", requestId);

      const mapped: Row[] = (lris ?? []).map((r: any) => ({
        id: r.id,
        lend_request_item_id: r.lend_request_item_id,
        item_id: r.lend_request_items.item_id,
        item_name: r.lend_request_items.catalog_items?.name ?? "",
        quantity: r.quantity,
        origin_source_id: r.source_id,
        origin_source_name: r.item_sources?.name ?? "—",
        target_source_id: r.source_id,
      }));
      setRows(mapped);
      setLoading(false);
    })();
  }, [open, requestId]);

  const submit = async () => {
    setSubmitting(true);
    try {
      const overrides = rows
        .filter((r) => r.target_source_id && r.target_source_id !== r.origin_source_id)
        .map((r) => ({ lris_id: r.id, source_id: r.target_source_id }));
      const { data, error } = await supabase.functions.invoke("return-lend-request", {
        body: { request_id: requestId, overrides },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("הוחזר בהצלחה");
      onReturned();
      onClose();
    } catch (e) {
      toast.error("שגיאה בהחזרה", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>החזרת ציוד</DialogTitle>
          <DialogDescription>בחר לאן להחזיר כל פריט (ברירת מחדל: המקור שממנו נלקח)</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {loading && <p className="text-sm text-muted-foreground">טוען...</p>}
          {!loading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">לא נמצאו פריטים שנמסרו עבור בקשה זו.</p>
          )}
          {rows.map((row) => (
            <div key={row.id} className="rounded-lg border border-border p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-semibold">{row.item_name} × {row.quantity}</h4>
                <span className="text-xs text-muted-foreground">נלקח מ: {row.origin_source_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">מחזיר ל:</label>
                <select
                  value={row.target_source_id}
                  onChange={(e) => setRows((rs) => rs.map((r) => r.id === row.id ? { ...r, target_source_id: e.target.value } : r))}
                  className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {sources.filter((s) => s.is_active || s.id === row.origin_source_id).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2 sm:justify-start">
          <Button onClick={submit} disabled={submitting || loading}>{submitting ? "מחזיר..." : "אשר החזרה"}</Button>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReturnDialog;
