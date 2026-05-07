import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Wish { id: string; name: string; description: string | null; link: string | null; created_at: string; }

export default function WishlistManager() {
  const { user } = useAuth();
  const [items, setItems] = useState<Wish[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [link, setLink] = useState("");

  const load = async () => {
    const { data } = await supabase.from("wishlist_items").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as Wish[]);
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const { error } = await supabase.from("wishlist_items").insert({
      name: name.trim(),
      description: desc.trim() || null,
      link: link.trim() || null,
      created_by: user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    setName(""); setDesc(""); setLink("");
    toast.success("נוסף לרשימה");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק פריט זה?")) return;
    const { error } = await supabase.from("wishlist_items").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <form onSubmit={add} className="space-y-3 rounded-2xl border border-border bg-card p-4 h-fit">
        <h2 className="text-lg font-bold">הוספה לרשימת קניות</h2>
        <div><Label>שם</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div><Label>תיאור</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} /></div>
        <div><Label>קישור (אופציונלי)</Label><Input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." /></div>
        <Button type="submit" className="w-full gap-1.5"><Plus className="h-4 w-4" />הוסף</Button>
      </form>

      <div className="space-y-2">
        {items.length === 0 && <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">הרשימה ריקה</p>}
        {items.map((w) => (
          <div key={w.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold break-words">{w.name}</h3>
              {w.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{w.description}</p>}
              {w.link && (
                <a href={w.link} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" />קישור
                </a>
              )}
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(w.id)} aria-label="מחק">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
