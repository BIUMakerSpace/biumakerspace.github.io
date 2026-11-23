import { useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Upload } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { filamentSwatchStyle } from "@/lib/filamentColors";
import { useFilamentColors } from "@/lib/queries/catalog";
import { useCreatePrintRequest } from "@/lib/queries/requests";
import { requesterSchema } from "@/lib/schemas";
import { validateStl } from "@/lib/storage";
import { getDisplayName } from "@/lib/user";
import { errorMessage } from "@/lib/errors";

const printSchema = requesterSchema.extend({
  purpose: z.string().trim().min(5).max(1000),
  filament_color: z.string().trim().min(1).max(50),
});

// Rendered behind <RequireAuth>, so a user is always present.
const Requests = () => {
  const { user } = useAuth();
  const userId = user!.id;
  const { data: colors = [], isLoading: colorsLoading } = useFilamentColors();
  const createRequest = useCreatePrintRequest(userId);
  const fileInput = useRef<HTMLInputElement>(null);

  const [pName, setPName] = useState(() => getDisplayName(user, ""));
  const [pEmail, setPEmail] = useState(user?.email ?? "");
  const [pPhone, setPPhone] = useState("");
  const [pPurpose, setPPurpose] = useState("");
  const [pColor, setPColor] = useState("");
  const [pFile, setPFile] = useState<File | null>(null);

  const submitPrint = async (e: FormEvent) => {
    e.preventDefault();
    if (!pFile) { toast.error("יש לצרף קובץ STL"); return; }
    const fileError = validateStl(pFile);
    if (fileError) { toast.error(fileError); return; }
    const parsed = printSchema.safeParse({
      requester_name: pName, requester_email: pEmail, requester_phone: pPhone,
      purpose: pPurpose, filament_color: pColor,
    });
    if (!parsed.success) { toast.error("יש למלא את כל השדות בצורה תקינה"); return; }
    try {
      await createRequest.mutateAsync({ ...parsed.data, file: pFile });
      toast.success("הבקשה נשלחה!", { description: "ניצור קשר בקרוב" });
      setPPurpose(""); setPColor(""); setPFile(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (err) {
      toast.error("שגיאה בשליחה", { description: errorMessage(err) });
    }
  };

  return (
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
                          style={filamentSwatchStyle(c.hex)}
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
          <label
            htmlFor="stl-file-input"
            className="mt-1 flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border bg-background p-4 hover:bg-accent/40"
          >
            <Upload className="h-5 w-5 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-sm text-muted-foreground">
              {pFile ? pFile.name : "בחרו קובץ STL להעלאה"}
            </span>
            <input
              ref={fileInput}
              id="stl-file-input"
              type="file"
              accept=".stl"
              onChange={(e) => setPFile(e.target.files?.[0] ?? null)}
              className="sr-only"
              required
            />
          </label>
          <p className="mt-1 text-xs text-muted-foreground">קבצי STL בלבד, עד 50MB</p>
        </div>
        <Button type="submit" disabled={createRequest.isPending} size="lg" className="w-full">
          {createRequest.isPending ? "שולח..." : "שלח בקשת הדפסה"}
        </Button>
      </form>
    </main>
  );
};

export default Requests;
