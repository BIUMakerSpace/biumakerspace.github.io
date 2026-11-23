import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ConfirmButton from "@/components/ConfirmButton";
import { safeUrl } from "@/lib/url";

type QtyPref = "one" | "few" | "many";
const QTY_LABEL: Record<QtyPref, string> = { one: "אחד", few: "כמה", many: "הרבה" };

interface Wish {
  id: string;
  name: string;
  description: string | null;
  link: string | null;
  estimated_cost: number | null;
  quantity_pref: QtyPref;
  created_at: string;
}

export default function WishlistManager() {
  const { user } = useAuth();
  const [items, setItems] = useState<Wish[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [link, setLink] = useState("");
  const [cost, setCost] = useState("");
  const [qty, setQty] = useState<QtyPref>("one");

  const load = async () => {
    const { data, error } = await supabase.from("wishlist_items").select("*").order("created_at", { ascending: false });
    if (error) toast.error("שגיאה בטעינה", { description: error.message });
    setItems((data ?? []) as Wish[]);
  };
  useEffect(() => { load(); }, []);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (link.trim() && !safeUrl(link.trim())) { toast.error("קישור חייב להתחיל ב-http:// או https://"); return; }
    const { error } = await supabase.from("wishlist_items").insert({
      name: name.trim(),
      description: desc.trim() || null,
      link: link.trim() || null,
      estimated_cost: cost.trim() ? Number(cost) : null,
      quantity_pref: qty,
      created_by: user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    setName(""); setDesc(""); setLink(""); setCost(""); setQty("one");
    toast.success("נוסף לרשימה");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("wishlist_items").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const totalCost = items.reduce((s, w) => s + (w.estimated_cost ?? 0), 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <form onSubmit={add} className="space-y-3 rounded-2xl border border-border bg-card p-4 h-fit">
        <h2 className="text-lg font-bold">הוספה לרשימת קניות</h2>
        <div><Label>שם</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div><Label>תיאור</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} /></div>
        <div><Label>קישור (אופציונלי)</Label><Input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." /></div>
        <div>
          <Label>עלות משוערת (₪)</Label>
          <Input type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="לדוגמה: 120" />
        </div>
        <div>
          <Label>כמות רצויה</Label>
          <div className="mt-1 inline-flex rounded-md border border-border bg-background p-0.5">
            {(["one", "few", "many"] as QtyPref[]).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQty(q)}
                className={`rounded px-3 py-1 text-xs font-medium transition ${qty === q ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >{QTY_LABEL[q]}</button>
            ))}
          </div>
        </div>
        <Button type="submit" className="w-full gap-1.5"><Plus className="h-4 w-4" />הוסף</Button>
      </form>

      <div className="space-y-2">
        {items.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {items.length} פריטים · עלות משוערת כוללת: <strong className="text-foreground">₪{totalCost.toLocaleString("he-IL")}</strong>
          </p>
        )}
        {items.length === 0 && <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">הרשימה ריקה</p>}
        {items.map((w) => (
          <div key={w.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold break-words">{w.name}</h3>
                <Badge variant="secondary" className="text-[10px]">כמות: {QTY_LABEL[w.quantity_pref]}</Badge>
                {w.estimated_cost != null && (
                  <Badge variant="outline" className="text-[10px]">₪{Number(w.estimated_cost).toLocaleString("he-IL")}</Badge>
                )}
              </div>
              {w.description && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{w.description}</p>}
              {safeUrl(w.link) && (
                <a href={safeUrl(w.link)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" />קישור
                </a>
              )}
            </div>
            <ConfirmButton
              title="למחוק פריט זה?"
              confirmLabel="מחק"
              onConfirm={() => remove(w.id)}
              trigger={
                <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="מחק">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
