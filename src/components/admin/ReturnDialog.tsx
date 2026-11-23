import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useItemSources, useReturnLendRequest } from "@/lib/queries/admin";
import { errorMessage, unwrap } from "@/lib/errors";

interface Props {
  onClose: () => void;
  requestId: string;
  onReturned: () => void;
}

/** Return delivered equipment, optionally to a different source than it came from. Mount only while open. */
const ReturnDialog = ({ onClose, requestId, onReturned }: Props) => {
  const { data: sources = [] } = useItemSources();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "on-loan-units", requestId],
    staleTime: 0,
    queryFn: async () => {
      const data = unwrap(
        await supabase
          .from("lend_request_item_sources")
          .select("id, source_id, quantity, item_sources(name), lend_request_items!inner(request_id, catalog_items(name))")
          .eq("lend_request_items.request_id", requestId),
        [],
      );
      return data.map((r) => ({
        id: r.id,
        quantity: r.quantity,
        itemName: r.lend_request_items.catalog_items?.name ?? "",
        originSourceId: r.source_id,
        originSourceName: r.item_sources?.name ?? "—",
      }));
    },
  });
  const returnRequest = useReturnLendRequest();
  // lris id -> chosen target source (defaults to where it came from)
  const [targets, setTargets] = useState<Record<string, string>>({});

  const submit = async () => {
    const overrides = rows
      .filter((r) => targets[r.id] && targets[r.id] !== r.originSourceId)
      .map((r) => ({ lris_id: r.id, source_id: targets[r.id] }));
    try {
      await returnRequest.mutateAsync({ requestId, overrides });
      toast.success("הוחזר בהצלחה");
      onReturned();
      onClose();
    } catch (e) {
      toast.error("שגיאה בהחזרה", { description: errorMessage(e) });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>החזרת ציוד</DialogTitle>
          <DialogDescription>בחר לאן להחזיר כל פריט (ברירת מחדל: המקור שממנו נלקח)</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {isLoading && <p className="text-sm text-muted-foreground">טוען...</p>}
          {!isLoading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">לא נמצאו פריטים שנמסרו עבור בקשה זו.</p>
          )}
          {rows.map((row) => (
            <div key={row.id} className="rounded-lg border border-border p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-semibold">{row.itemName} × {row.quantity}</h4>
                <span className="text-xs text-muted-foreground">נלקח מ: {row.originSourceName}</span>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor={`return-${row.id}`} className="text-sm text-muted-foreground">מחזיר ל:</label>
                <select
                  id={`return-${row.id}`}
                  value={targets[row.id] ?? row.originSourceId}
                  onChange={(e) => setTargets((t) => ({ ...t, [row.id]: e.target.value }))}
                  className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {sources.filter((s) => s.is_active || s.id === row.originSourceId).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2 sm:justify-start">
          <Button onClick={submit} disabled={returnRequest.isPending || isLoading}>{returnRequest.isPending ? "מחזיר..." : "אשר החזרה"}</Button>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReturnDialog;
