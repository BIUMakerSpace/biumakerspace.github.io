import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

interface CatalogItem {
  id: string;
  name: string;
  quantity_available: number;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  user: Profile | null;
  onCreated: () => void;
}

export default function CreateLendForUser({ open, onClose, user, onCreated }: Props) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [picked, setPicked] = useState<{ item_id: string; name: string; quantity: number; max: number }[]>([]);
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPicked([]);
    setNotes("");
    setSearch("");
    supabase
      .from("catalog_items")
      .select("id, name, quantity_available")
      .order("name")
      .then(({ data }) => setItems((data ?? []) as CatalogItem[]));
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items.slice(0, 50);
    return items.filter((it) => it.name.toLowerCase().includes(q)).slice(0, 50);
  }, [items, search]);

  const addItem = (it: CatalogItem) => {
    if (picked.some((p) => p.item_id === it.id)) return;
    if (it.quantity_available <= 0) {
      toast.error("הפריט אינו זמין");
      return;
    }
    setPicked([...picked, { item_id: it.id, name: it.name, quantity: 1, max: it.quantity_available }]);
  };

  const removeItem = (id: string) => setPicked(picked.filter((p) => p.item_id !== id));

  const setQty = (id: string, q: number) =>
    setPicked(picked.map((p) => (p.item_id === id ? { ...p, quantity: Math.max(1, Math.min(p.max, q)) } : p)));

  const submit = async () => {
    if (!user) return;
    if (!picked.length) {
      toast.error("יש לבחור לפחות פריט אחד");
      return;
    }
    setSubmitting(true);
    try {
      const { data: req, error } = await supabase
        .from("lend_requests")
        .insert({
          user_id: user.id,
          requester_name: user.full_name ?? user.email ?? "משתמש",
          requester_email: user.email ?? "",
          requester_phone: user.phone ?? "",
          notes: notes || null,
          status: "approved",
        })
        .select("id")
        .single();
      if (error) throw error;

      const { error: itemsErr } = await supabase.from("lend_request_items").insert(
        picked.map((p) => ({ request_id: req.id, item_id: p.item_id, quantity: p.quantity })),
      );
      if (itemsErr) throw itemsErr;

      toast.success("ההשאלה נוצרה");
      onCreated();
      onClose();
    } catch (err) {
      toast.error("שגיאה", { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>יצירת השאלה עבור {user?.full_name ?? user?.email}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>חיפוש פריט</Label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="הקלד שם פריט..." className="pr-9" />
            </div>
            <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-border bg-background">
              {filtered.length === 0 && <p className="p-3 text-center text-xs text-muted-foreground">אין פריטים</p>}
              {filtered.map((it) => {
                const already = picked.some((p) => p.item_id === it.id);
                return (
                  <button
                    key={it.id}
                    type="button"
                    disabled={already || it.quantity_available <= 0}
                    onClick={() => addItem(it)}
                    className="flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-right text-sm last:border-0 hover:bg-accent disabled:opacity-50"
                  >
                    <span>{it.name}</span>
                    <span className="text-xs text-muted-foreground">זמין: {it.quantity_available}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>פריטים נבחרים ({picked.length})</Label>
            {picked.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                לא נבחרו פריטים
              </p>
            ) : (
              <ul className="space-y-2">
                {picked.map((p) => (
                  <li key={p.item_id} className="flex items-center gap-2 rounded-md border border-border bg-card p-2">
                    <span className="flex-1 text-sm">{p.name}</span>
                    <Input
                      type="number"
                      min={1}
                      max={p.max}
                      value={p.quantity}
                      onChange={(e) => setQty(p.item_id, parseInt(e.target.value) || 1)}
                      className="h-8 w-20"
                    />
                    <span className="text-xs text-muted-foreground">/ {p.max}</span>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeItem(p.item_id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <Label>הערות (אופציונלי)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button onClick={submit} disabled={submitting} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {submitting ? "יוצר..." : "צור השאלה"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
