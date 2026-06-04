import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Download, LockOpen } from "lucide-react";

interface Locker {
  id: string;
  number: number;
  label: string | null;
  occupied_by: string | null;
  occupant_name: string | null;
  occupant_email: string | null;
  pin_code: string | null;
  occupied_at: string | null;
}

const LockersManager = () => {
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [loading, setLoading] = useState(true);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("lockers").select("*").order("number");
    if (error) toast.error("שגיאה בטעינת לוקרים", { description: error.message });
    setLockers((data ?? []) as Locker[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const forceRelease = async (l: Locker) => {
    if (!confirm(`לשחרר את לוקר ${l.number}?`)) return;
    const { error } = await supabase
      .from("lockers")
      .update({ occupied_by: null, occupant_name: null, occupant_email: null, pin_code: null, occupied_at: null })
      .eq("id", l.id);
    if (error) { toast.error("שגיאה", { description: error.message }); return; }
    toast.success("הלוקר שוחרר");
    load();
  };

  const downloadQr = (n: number) => {
    const svg = document.getElementById(`qr-locker-${n}`) as unknown as SVGElement | null;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `locker-${n}-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="text-muted-foreground">טוען...</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
        הדפס את ה-QR של כל לוקר והדבק עליו. סריקה תפנה את המשתמש לדף תפיסת הלוקר.
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {lockers.map((l) => {
          const url = `${origin}/lockers/${l.number}`;
          const occupied = !!l.occupied_by;
          return (
            <Card key={l.id} className={occupied ? "border-amber-500/40" : "border-border"}>
              <CardContent className="flex gap-4 p-4">
                <div className="flex flex-col items-center gap-2 rounded-md bg-white p-2">
                  <QRCodeSVG id={`qr-locker-${l.number}`} value={url} size={120} level="M" includeMargin />
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => downloadQr(l.number)}>
                    <Download className="h-3.5 w-3.5" /> QR
                  </Button>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xl font-black">לוקר {l.number}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${occupied ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"}`}>
                      {occupied ? "תפוס" : "פנוי"}
                    </span>
                  </div>
                  {occupied ? (
                    <>
                      <p className="text-sm"><span className="text-muted-foreground">בידי:</span> {l.occupant_name ?? "—"}</p>
                      <p className="text-sm"><span className="text-muted-foreground">אימייל:</span> {l.occupant_email ?? "—"}</p>
                      <p className="text-sm"><span className="text-muted-foreground">פין:</span> <span className="font-mono font-semibold">{l.pin_code ?? "—"}</span></p>
                      <p className="text-xs text-muted-foreground">
                        מאז: {l.occupied_at ? new Date(l.occupied_at).toLocaleString("he-IL") : "—"}
                      </p>
                      <Button variant="outline" size="sm" className="mt-2 gap-1" onClick={() => forceRelease(l)}>
                        <LockOpen className="h-3.5 w-3.5" /> שחרר
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">אין משתמש רשום</p>
                  )}
                  <p className="break-all text-xs text-muted-foreground/70">{url}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default LockersManager;
