import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SiteNav from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Lock, LockOpen, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface LockerStatus {
  id: string;
  number: number;
  label: string | null;
  is_occupied: boolean;
  occupied_by: string | null;
  occupied_at: string | null;
}

interface MyLocker {
  id: string;
  number: number;
  label: string | null;
  occupied_by: string | null;
  occupant_name: string | null;
  occupant_email: string | null;
  pin_code: string | null;
  occupied_at: string | null;
}

const Lockers = () => {
  const { number: numberParam } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [lockers, setLockers] = useState<LockerStatus[]>([]);
  const [myLocker, setMyLocker] = useState<MyLocker | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimTarget, setClaimTarget] = useState<LockerStatus | null>(null);
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lockers_status" as never)
      .select("*")
      .order("number");
    setLockers(((data as unknown) as LockerStatus[]) ?? []);
    if (user) {
      const { data: mine } = await supabase.rpc("get_my_locker" as never);
      const row = Array.isArray(mine) ? (mine[0] as MyLocker | undefined) : null;
      setMyLocker(row ?? null);
    } else {
      setMyLocker(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Handle QR scan: /lockers/:number
  useEffect(() => {
    if (authLoading || loading || !numberParam) return;
    if (!user) {
      navigate(`/auth?redirect=/lockers/${numberParam}`);
      return;
    }
    const n = Number(numberParam);
    const target = lockers.find((l) => l.number === n);
    if (!target) {
      setScanError(`לוקר מספר ${numberParam} לא נמצא במערכת.`);
      return;
    }
    if (target.is_occupied && target.occupied_by !== user.id) {
      setScanError(
        `לוקר ${target.number} כבר תפוס. אם זו טעות, פנה למנהל.`
      );
      return;
    }
    if (target.occupied_by === user.id) {
      setScanError(null);
      return;
    }
    setClaimTarget(target);
    setScanError(null);
  }, [authLoading, loading, numberParam, user, lockers, navigate]);

  const claim = async () => {
    if (!claimTarget || !user) return;
    if (!pin.trim() || pin.length < 3) {
      toast.error("הזן קוד נעילה תקין (לפחות 3 ספרות)");
      return;
    }
    if (myLocker && myLocker.id !== claimTarget.id) {
      toast.error("כבר רשום עליך לוקר אחר. שחרר אותו לפני שתתפוס חדש.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("claim_locker" as never, {
      p_number: claimTarget.number,
      p_pin: pin.trim(),
    } as never);
    setSubmitting(false);
    if (error) {
      toast.error("שגיאה בתפיסת הלוקר", { description: error.message });
      return;
    }
    toast.success(`לוקר ${claimTarget.number} נרשם על שמך`);
    setClaimTarget(null);
    setPin("");
    if (numberParam) navigate("/lockers", { replace: true });
    load();
  };

  const release = async (l: MyLocker) => {
    if (!user) return;
    const { error } = await supabase
      .from("lockers")
      .update({ occupied_by: null })
      .eq("id", l.id)
      .eq("occupied_by", user.id);
    if (error) {
      toast.error("שגיאה בשחרור הלוקר", { description: error.message });
      return;
    }
    toast.success(`לוקר ${l.number} שוחרר`);
    load();
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SiteNav />
      <main className="container mx-auto max-w-5xl px-4 py-8 md:py-12">
        <h1 className="mb-2 text-3xl font-black tracking-tight md:text-4xl">לוקרים</h1>
        <p className="mb-6 text-muted-foreground">
          סרוק את ה-QR שעל הלוקר כדי לתפוס אותו. הלוקר יירשם על שמך ותזין את קוד הנעילה שלך.
        </p>

        {scanError && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">לא ניתן לתפוס את הלוקר</p>
              <p className="text-sm">{scanError}</p>
            </div>
          </div>
        )}

        {!user && (
          <div className="mb-6 rounded-lg border border-border bg-card p-4">
            <p className="mb-2">כדי לתפוס לוקר עליך להתחבר.</p>
            <Link to="/auth"><Button>התחברות</Button></Link>
          </div>
        )}

        {user && myLocker && (
          <Card className="mb-6 border-primary/40 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                הלוקר שלך: מספר {myLocker.number}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                תפוס מאז: {myLocker.occupied_at ? new Date(myLocker.occupied_at).toLocaleString("he-IL") : "—"}
              </p>
              {myLocker.pin_code && (
                <p className="text-sm">קוד נעילה רשום: <span className="font-mono font-semibold">{myLocker.pin_code}</span></p>
              )}
              <Button variant="destructive" onClick={() => release(myLocker)} className="gap-2">
                <LockOpen className="h-4 w-4" />
                שחרר את הלוקר
              </Button>
            </CardContent>
          </Card>
        )}

        <h2 className="mb-3 text-xl font-bold">מצב הלוקרים</h2>
        {loading ? (
          <p className="text-muted-foreground">טוען...</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {lockers.map((l) => {
              const mine = user && l.occupied_by === user.id;
              const free = !l.is_occupied;
              return (
                <Card
                  key={l.id}
                  className={`transition-colors ${
                    mine ? "border-primary bg-primary/10" : free ? "border-border" : "border-border bg-muted/40"
                  }`}
                >
                  <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                    {free ? <LockOpen className="h-6 w-6 text-primary" /> : <Lock className="h-6 w-6 text-muted-foreground" />}
                    <div className="text-2xl font-black">{l.number}</div>
                    <div className="text-xs">
                      {free ? (
                        <span className="text-primary">פנוי</span>
                      ) : mine ? (
                        <span className="text-primary font-semibold">שלך</span>
                      ) : (
                        <span className="text-muted-foreground">תפוס</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={!!claimTarget} onOpenChange={(o) => { if (!o) { setClaimTarget(null); setPin(""); } }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>תפיסת לוקר {claimTarget?.number}</DialogTitle>
            <DialogDescription>
              הזן את קוד הנעילה שתשתמש בו לנעילת הלוקר. הקוד יישמר במערכת לטובת המנהלים בלבד.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>קוד נעילה</Label>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={10}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\s/g, ""))}
              placeholder="לדוגמה: 1234"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={claim} disabled={submitting}>
              {submitting ? "תופס..." : "תפוס לוקר"}
            </Button>
            <Button variant="outline" onClick={() => { setClaimTarget(null); setPin(""); }}>ביטול</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Lockers;
