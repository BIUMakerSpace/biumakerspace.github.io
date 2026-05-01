import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";

interface Source {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

const ItemSourcesManager = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [eName, setEName] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [eActive, setEActive] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("item_sources")
      .select("*")
      .order("sort_order")
      .order("name");
    setSources((data ?? []) as Source[]);
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const { error } = await supabase
      .from("item_sources")
      .insert({ name: name.trim(), description: desc.trim() || null });
    if (error) toast.error(error.message);
    else { toast.success("מקור נוסף"); setName(""); setDesc(""); load(); }
  };

  const startEdit = (s: Source) => {
    setEditId(s.id); setEName(s.name); setEDesc(s.description ?? ""); setEActive(s.is_active);
  };
  const saveEdit = async () => {
    if (!editId) return;
    const { error } = await supabase
      .from("item_sources")
      .update({ name: eName.trim(), description: eDesc.trim() || null, is_active: eActive })
      .eq("id", editId);
    if (error) toast.error(error.message);
    else { toast.success("עודכן"); setEditId(null); load(); }
  };
  const remove = async (id: string) => {
    if (!confirm("למחוק מקור זה? הפעולה תיכשל אם יש פריטים המשויכים אליו.")) return;
    const { error } = await supabase.from("item_sources").delete().eq("id", id);
    if (error) toast.error("לא ניתן למחוק - יש פריטים המשויכים למקור זה");
    else { toast.success("נמחק"); load(); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={add} className="space-y-3 rounded-2xl border border-border bg-card p-5 h-fit">
        <h2 className="text-lg font-bold">הוספת מקור אחסון</h2>
        <p className="text-xs text-muted-foreground">לדוגמה: ארגז אדום, מגירה 3, מדף עליון</p>
        <div><Label>שם</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div><Label>תיאור (אופציונלי)</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} /></div>
        <Button type="submit" className="w-full gap-1.5"><Plus className="h-4 w-4" />הוסף</Button>
      </form>
      <div className="space-y-2">
        <h2 className="text-lg font-bold">מקורות קיימים ({sources.length})</h2>
        {sources.map((s) => (
          <div key={s.id} className="rounded-lg border border-border bg-card p-3">
            {editId === s.id ? (
              <div className="space-y-2">
                <Input value={eName} onChange={(e) => setEName(e.target.value)} />
                <Textarea value={eDesc} onChange={(e) => setEDesc(e.target.value)} rows={2} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={eActive} onChange={(e) => setEActive(e.target.checked)} />
                  פעיל
                </label>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit} className="gap-1"><Check className="h-3.5 w-3.5" />שמור</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditId(null)} className="gap-1"><X className="h-3.5 w-3.5" />ביטול</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{s.name}</h3>
                    {!s.is_active && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">לא פעיל</span>}
                  </div>
                  {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ItemSourcesManager;
