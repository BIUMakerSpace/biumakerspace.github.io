import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fetchAllFilamentColors, type FilamentColor } from "@/lib/filamentColors";

const FilamentColorsManager = () => {
  const [colors, setColors] = useState<FilamentColor[]>([]);
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#000000");
  const [submitting, setSubmitting] = useState(false);

  const [edit, setEdit] = useState<FilamentColor | null>(null);
  const [eName, setEName] = useState("");
  const [eHex, setEHex] = useState("#000000");
  const [eActive, setEActive] = useState(true);
  const [eSubmitting, setESubmitting] = useState(false);

  const load = async () => {
    try {
      setColors(await fetchAllFilamentColors());
    } catch (err) {
      toast.error("שגיאה בטעינה", { description: (err as Error).message });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const nextOrder = (colors[colors.length - 1]?.sort_order ?? 0) + 1;
      const { error } = await supabase.from("filament_colors").insert({
        name: name.trim(),
        hex: hex || null,
        sort_order: nextOrder,
      });
      if (error) throw error;
      toast.success("צבע נוסף");
      setName("");
      setHex("#000000");
      load();
    } catch (err) {
      toast.error("שגיאה", { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (c: FilamentColor) => {
    const { error } = await supabase
      .from("filament_colors")
      .update({ is_active: !c.is_active })
      .eq("id", c.id);
    if (error) toast.error(error.message);
    else load();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק צבע זה?")) return;
    const { error } = await supabase.from("filament_colors").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("נמחק");
      load();
    }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const a = colors[idx];
    const b = colors[idx + dir];
    if (!a || !b) return;
    const { error } = await supabase.from("filament_colors").upsert([
      { ...a, sort_order: b.sort_order },
      { ...b, sort_order: a.sort_order },
    ]);
    if (error) toast.error(error.message);
    else load();
  };

  const openEdit = (c: FilamentColor) => {
    setEdit(c);
    setEName(c.name);
    setEHex(c.hex ?? "#000000");
    setEActive(c.is_active);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    setESubmitting(true);
    try {
      const { error } = await supabase
        .from("filament_colors")
        .update({ name: eName.trim(), hex: eHex || null, is_active: eActive })
        .eq("id", edit.id);
      if (error) throw error;
      toast.success("עודכן");
      setEdit(null);
      load();
    } catch (err) {
      toast.error("שגיאה", { description: (err as Error).message });
    } finally {
      setESubmitting(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
      <form onSubmit={add} className="h-fit space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold">הוספת צבע</h2>
        <div>
          <Label>שם הצבע</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={50} placeholder="לדוגמה: ורוד" />
        </div>
        <div>
          <Label>גוון (לתצוגה)</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background"
            />
            <Input value={hex} onChange={(e) => setHex(e.target.value)} placeholder="#000000" maxLength={9} />
          </div>
        </div>
        <Button type="submit" disabled={submitting} className="w-full gap-1.5">
          <Plus className="h-4 w-4" />
          {submitting ? "מוסיף..." : "הוסף צבע"}
        </Button>
      </form>

      <div>
        <h2 className="mb-4 text-xl font-bold">
          צבעים <span className="text-muted-foreground">({colors.length})</span>
        </h2>
        {colors.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            אין צבעים מוגדרים
          </p>
        ) : (
          <ul className="space-y-3">
            {colors.map((c, idx) => (
              <li key={c.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <span
                    className="h-9 w-9 shrink-0 rounded-full border border-border"
                    style={{ backgroundColor: c.hex ?? "transparent" }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold ${!c.is_active ? "text-muted-foreground line-through" : ""}`}>{c.name}</p>
                    {c.hex && <p className="text-xs text-muted-foreground">{c.hex}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${c.is_active ? "border-primary/30 text-primary" : "border-border text-muted-foreground"}`}>
                    {c.is_active ? "פעיל" : "לא פעיל"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toggleActive(c)}>
                    {c.is_active ? "השבתה" : "הפעלה"}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => move(idx, -1)} disabled={idx === 0}>
                    <ArrowUp className="h-3.5 w-3.5" />
                    למעלה
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => move(idx, 1)} disabled={idx === colors.length - 1}>
                    <ArrowDown className="h-3.5 w-3.5" />
                    למטה
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEdit(c)}>
                    <Pencil className="h-3.5 w-3.5" />
                    עריכה
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => remove(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    מחיקה
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>עריכת צבע</DialogTitle>
          </DialogHeader>
          {edit && (
            <form onSubmit={saveEdit} className="space-y-3">
              <div>
                <Label>שם</Label>
                <Input value={eName} onChange={(e) => setEName(e.target.value)} required maxLength={50} />
              </div>
              <div>
                <Label>גוון</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={eHex}
                    onChange={(e) => setEHex(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background"
                  />
                  <Input value={eHex} onChange={(e) => setEHex(e.target.value)} maxLength={9} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <Label htmlFor="e-active" className="m-0">פעיל</Label>
                <Switch id="e-active" checked={eActive} onCheckedChange={setEActive} />
              </div>
              <DialogFooter className="gap-2 sm:justify-start">
                <Button type="submit" disabled={eSubmitting}>{eSubmitting ? "שומר..." : "שמור"}</Button>
                <Button type="button" variant="outline" onClick={() => setEdit(null)}>ביטול</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FilamentColorsManager;
