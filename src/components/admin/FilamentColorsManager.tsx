import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fetchAllFilamentColors, filamentSwatchStyle, type FilamentColor } from "@/lib/filamentColors";

type Mode = "solid" | "gradient";

const buildGradient = (a: string, b: string, angle: number) =>
  `linear-gradient(${angle}deg, ${a}, ${b})`;

/** Best-effort parse of an existing gradient string into its parts. */
const parseGradient = (value: string | null) => {
  if (!value || !value.includes("gradient")) return null;
  const m = value.match(/linear-gradient\(\s*(-?\d+)deg\s*,\s*(#[0-9a-fA-F]{3,8})\s*,\s*(#[0-9a-fA-F]{3,8})\s*\)/);
  if (!m) return null;
  return { angle: parseInt(m[1], 10), a: m[2], b: m[3] };
};

interface ColorPickerProps {
  mode: Mode;
  setMode: (m: Mode) => void;
  hex: string;
  setHex: (v: string) => void;
  gA: string; setGA: (v: string) => void;
  gB: string; setGB: (v: string) => void;
  angle: number; setAngle: (n: number) => void;
}

const ColorPicker = ({ mode, setMode, hex, setHex, gA, setGA, gB, setGB, angle, setAngle }: ColorPickerProps) => (
  <div className="space-y-3">
    <div className="inline-flex rounded-md border border-border bg-background p-0.5">
      <button
        type="button"
        onClick={() => setMode("solid")}
        className={`rounded px-3 py-1 text-xs font-medium transition ${mode === "solid" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
      >צבע אחיד</button>
      <button
        type="button"
        onClick={() => setMode("gradient")}
        className={`rounded px-3 py-1 text-xs font-medium transition ${mode === "gradient" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
      >גרדיאנט</button>
    </div>

    {mode === "solid" ? (
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background"
        />
        <Input value={hex} onChange={(e) => setHex(e.target.value)} placeholder="#000000" maxLength={9} />
      </div>
    ) : (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input type="color" value={gA} onChange={(e) => setGA(e.target.value)} className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background" />
          <Input value={gA} onChange={(e) => setGA(e.target.value)} maxLength={9} className="w-28" />
          <span className="text-muted-foreground">→</span>
          <input type="color" value={gB} onChange={(e) => setGB(e.target.value)} className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background" />
          <Input value={gB} onChange={(e) => setGB(e.target.value)} maxLength={9} className="w-28" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="m-0 text-xs text-muted-foreground">זווית</Label>
          <Input type="number" min={0} max={360} value={angle} onChange={(e) => setAngle(parseInt(e.target.value) || 0)} className="h-8 w-20" />
          <span className="text-xs text-muted-foreground">°</span>
          <div
            className="ml-2 h-8 flex-1 rounded border border-border"
            style={{ backgroundImage: buildGradient(gA, gB, angle) }}
          />
        </div>
      </div>
    )}
  </div>
);

const FilamentColorsManager = () => {
  const [colors, setColors] = useState<FilamentColor[]>([]);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<Mode>("solid");
  const [hex, setHex] = useState("#000000");
  const [gA, setGA] = useState("#ff0080");
  const [gB, setGB] = useState("#7928ca");
  const [angle, setAngle] = useState(90);
  const [submitting, setSubmitting] = useState(false);

  const [edit, setEdit] = useState<FilamentColor | null>(null);
  const [eName, setEName] = useState("");
  const [eMode, setEMode] = useState<Mode>("solid");
  const [eHex, setEHex] = useState("#000000");
  const [eGA, setEGA] = useState("#ff0080");
  const [eGB, setEGB] = useState("#7928ca");
  const [eAngle, setEAngle] = useState(90);
  const [eActive, setEActive] = useState(true);
  const [eSubmitting, setESubmitting] = useState(false);

  const load = async () => {
    try {
      setColors(await fetchAllFilamentColors());
    } catch (err) {
      toast.error("שגיאה בטעינה", { description: (err as Error).message });
    }
  };

  useEffect(() => { load(); }, []);

  const composedAdd = mode === "gradient" ? buildGradient(gA, gB, angle) : (hex || null);
  const composedEdit = eMode === "gradient" ? buildGradient(eGA, eGB, eAngle) : (eHex || null);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const nextOrder = (colors[colors.length - 1]?.sort_order ?? 0) + 1;
      const { error } = await supabase.from("filament_colors").insert({
        name: name.trim(),
        hex: composedAdd,
        sort_order: nextOrder,
      });
      if (error) throw error;
      toast.success("צבע נוסף");
      setName(""); setHex("#000000"); setMode("solid");
      load();
    } catch (err) {
      toast.error("שגיאה", { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (c: FilamentColor) => {
    const { error } = await supabase.from("filament_colors").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) toast.error(error.message); else load();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק צבע זה?")) return;
    const { error } = await supabase.from("filament_colors").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("נמחק"); load(); }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const a = colors[idx]; const b = colors[idx + dir];
    if (!a || !b) return;
    const { error } = await supabase.from("filament_colors").upsert([
      { ...a, sort_order: b.sort_order },
      { ...b, sort_order: a.sort_order },
    ]);
    if (error) toast.error(error.message); else load();
  };

  const openEdit = (c: FilamentColor) => {
    setEdit(c);
    setEName(c.name);
    setEActive(c.is_active);
    const g = parseGradient(c.hex);
    if (g) {
      setEMode("gradient"); setEGA(g.a); setEGB(g.b); setEAngle(g.angle);
      setEHex("#000000");
    } else {
      setEMode("solid"); setEHex(c.hex ?? "#000000");
      setEGA("#ff0080"); setEGB("#7928ca"); setEAngle(90);
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    setESubmitting(true);
    try {
      const { error } = await supabase
        .from("filament_colors")
        .update({ name: eName.trim(), hex: composedEdit, is_active: eActive })
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
          <ColorPicker mode={mode} setMode={setMode} hex={hex} setHex={setHex} gA={gA} setGA={setGA} gB={gB} setGB={setGB} angle={angle} setAngle={setAngle} />
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
                    style={filamentSwatchStyle(c.hex)}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold ${!c.is_active ? "text-muted-foreground line-through" : ""}`}>{c.name}</p>
                    {c.hex && <p className="truncate text-xs text-muted-foreground">{c.hex}</p>}
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
                <ColorPicker mode={eMode} setMode={setEMode} hex={eHex} setHex={setEHex} gA={eGA} setGA={setEGA} gB={eGB} setGB={setEGB} angle={eAngle} setAngle={setEAngle} />
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
