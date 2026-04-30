import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SiteNav from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Upload } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { fetchActiveFilamentColors, type FilamentColor } from "@/lib/filamentColors";

const printSchema = z.object({
  requester_name: z.string().trim().min(2).max(100),
  requester_email: z.string().trim().email().max(255),
  requester_phone: z.string().trim().min(7).max(20),
  purpose: z.string().trim().min(5).max(1000),
  filament_color: z.string().trim().min(1).max(50),
});

const Requests = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [colors, setColors] = useState<FilamentColor[]>([]);
  const [colorsLoading, setColorsLoading] = useState(true);

  const [pName, setPName] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pPurpose, setPPurpose] = useState("");
  const [pColor, setPColor] = useState("");
  const [pFile, setPFile] = useState<File | null>(null);
  const [pSubmitting, setPSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    setPEmail(user.email ?? "");
    const meta = (user.user_metadata ?? {}) as Record<string, string>;
    const name = meta.full_name || meta.name || "";
    setPName(name);
  }, [user]);

  useEffect(() => {
    fetchActiveFilamentColors()
      .then((c) => setColors(c))
      .catch(() => setColors([]))
      .finally(() => setColorsLoading(false));
  }, []);

  const submitPrint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!pFile) { toast.error("יש לצרף קובץ STL"); return; }
    if (pFile.size > 50 * 1024 * 1024) { toast.error("הקובץ גדול מדי (מקסימום 50MB)"); return; }
    const parsed = printSchema.safeParse({
      requester_name: pName, requester_email: pEmail, requester_phone: pPhone,
      purpose: pPurpose, filament_color: pColor,
    });
    if (!parsed.success) { toast.error("יש למלא את כל השדות בצורה תקינה"); return; }
    setPSubmitting(true);
    try {
      const path = `${user.id}/${Date.now()}-${pFile.name}`;
      const { error: upErr } = await supabase.storage.from("stl-files").upload(path, pFile);
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("print_requests").insert([{
        user_id: user.id,
        requester_name: parsed.data.requester_name,
        requester_email: parsed.data.requester_email,
        requester_phone: parsed.data.requester_phone,
        purpose: parsed.data.purpose,
        filament_color: parsed.data.filament_color,
        stl_file_path: path,
        stl_file_name: pFile.name,
      }]);
      if (insErr) throw insErr;
      toast.success("הבקשה נשלחה!", { description: "ניצור קשר בקרוב" });
      setPPurpose(""); setPColor(""); setPFile(null);
      const inp = document.getElementById("stl-file-input") as HTMLInputElement | null;
      if (inp) inp.value = "";
    } catch (err) {
      toast.error("שגיאה בשליחה", { description: (err as Error).message });
    } finally {
      setPSubmitting(false);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SiteNav />
      <main className="container mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Printer className="h-7 w-7" />
          </div>
          <h1 className="mb-2 text-3xl font-black text-foreground md:text-4xl">
            <span className="text-gradient">הדפסת</span> תלת מימד
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            העלו קובץ STL ובחרו צבע פילמנט – אנו נדפיס וניצור קשר
          </p>
        </div>

        <form onSubmit={submitPrint} className="space-y-5 rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="p-name">שם מלא</Label>
              <Input id="p-name" value={pName} onChange={(e) => setPName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="p-email">אימייל</Label>
              <Input id="p-email" type="email" value={pEmail} onChange={(e) => setPEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="p-phone">טלפון</Label>
              <Input id="p-phone" type="tel" value={pPhone} onChange={(e) => setPPhone(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="p-color">צבע פילמנט</Label>
              <Select value={pColor} onValueChange={setPColor} disabled={colorsLoading || colors.length === 0}>
                <SelectTrigger id="p-color">
                  <SelectValue placeholder={colorsLoading ? "טוען צבעים..." : colors.length === 0 ? "אין צבעים זמינים" : "בחרו צבע"} />
                </SelectTrigger>
                <SelectContent>
                  {colors.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      <span className="inline-flex items-center gap-2">
                        {c.hex && (
                          <span
                            className="inline-block h-3.5 w-3.5 rounded-full border border-border"
                            style={{ backgroundColor: c.hex }}
                          />
                        )}
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="p-purpose">מטרת ההדפסה</Label>
            <Textarea id="p-purpose" value={pPurpose} onChange={(e) => setPPurpose(e.target.value)} rows={4} required placeholder="ספרו על הפרויקט והשימוש המיועד..." />
          </div>
          <div>
            <Label htmlFor="stl-file-input">קובץ STL</Label>
            <div className="mt-1 flex items-center gap-3 rounded-md border border-dashed border-border bg-background p-4">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <input
                id="stl-file-input"
                type="file"
                accept=".stl,.STL"
                onChange={(e) => setPFile(e.target.files?.[0] ?? null)}
                className="flex-1 text-sm"
                required
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">קבצי STL בלבד, עד 50MB</p>
          </div>
          <Button type="submit" disabled={pSubmitting} size="lg" className="w-full">
            {pSubmitting ? "שולח..." : "שלח בקשת הדפסה"}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default Requests;
