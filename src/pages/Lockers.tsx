import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { PageLoading } from "@/components/layout/PageStates";
import { Lock, LockOpen, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useClaimLocker, useLockersStatus, useMyLocker, useReleaseLocker } from "@/lib/queries/lockers";
import { errorMessage } from "@/lib/errors";
import { formatDateTimeHe } from "@/lib/format";

const Lockers = () => {
  // Set when the page is opened from a locker's QR code: /lockers/:number
  const { number: numberParam } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: lockers = [], isLoading: lockersLoading } = useLockersStatus(!authLoading);
  const { data: myLocker } = useMyLocker(user?.id);
  const claimLocker = useClaimLocker();
  const releaseLocker = useReleaseLocker(user?.id);
  const [pin, setPin] = useState("");
  const [dismissedScan, setDismissedScan] = useState<string | null>(null);

  // A scanned QR needs a signed-in user; come back here after signing in.
  useEffect(() => {
    if (!authLoading && !user && numberParam) {
      navigate(`/auth?redirect=/lockers/${numberParam}`, { replace: true });
    }
  }, [authLoading, user, numberParam, navigate]);

  const loading = authLoading || lockersLoading;
  const scanned = numberParam && !loading ? lockers.find((l) => l.number === Number(numberParam)) : undefined;
  let scanError: string | null = null;
  if (numberParam && !loading && user) {
    if (!scanned) scanError = `לוקר מספר ${numberParam} לא נמצא במערכת.`;
    else if (scanned.is_occupied && scanned.occupied_by !== user.id) scanError = `לוקר ${scanned.number} כבר תפוס. אם זו טעות, פנה למנהל.`;
  }
  const claimTarget = user && scanned && !scanned.is_occupied && dismissedScan !== numberParam ? scanned : null;

  const closeDialog = () => {
    setDismissedScan(numberParam ?? null);
    setPin("");
  };

  const claim = async () => {
    if (!claimTarget) return;
    const trimmed = pin.trim();
    if (trimmed.length < 3) {
      toast.error("הזן קוד נעילה תקין (לפחות 3 ספרות)");
      return;
    }
    if (myLocker && myLocker.id !== claimTarget.id) {
      toast.error("כבר רשום עליך לוקר אחר. שחרר אותו לפני שתתפוס חדש.");
      return;
    }
    try {
      await claimLocker.mutateAsync({ number: claimTarget.number, pin: trimmed });
      toast.success(`לוקר ${claimTarget.number} נרשם על שמך`);
      setPin("");
      navigate("/lockers", { replace: true });
    } catch (err) {
      toast.error("שגיאה בתפיסת הלוקר", { description: errorMessage(err) });
    }
  };

  const release = async (locker: { id: string; number: number }) => {
    try {
      await releaseLocker.mutateAsync(locker.id);
      toast.success(`לוקר ${locker.number} שוחרר`);
    } catch (err) {
      toast.error("שגיאה בשחרור הלוקר", { description: errorMessage(err) });
    }
  };

  return (
    <>
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

        {!authLoading && !user && (
          <div className="mb-6 rounded-lg border border-border bg-card p-4">
            <p className="mb-2">כדי לתפוס לוקר עליך להתחבר.</p>
            <Button asChild><Link to="/auth?redirect=/lockers">התחברות</Link></Button>
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
              <p className="text-sm text-muted-foreground">תפוס מאז: {formatDateTimeHe(myLocker.occupied_at)}</p>
              {myLocker.pin_code && (
                <p className="text-sm">קוד נעילה רשום: <span className="font-mono font-semibold">{myLocker.pin_code}</span></p>
              )}
              <Button variant="destructive" onClick={() => release(myLocker)} disabled={releaseLocker.isPending} className="gap-2">
                <LockOpen className="h-4 w-4" />
                שחרר את הלוקר
              </Button>
            </CardContent>
          </Card>
        )}

        <h2 className="mb-3 text-xl font-bold">מצב הלוקרים</h2>
        {loading ? (
          <PageLoading />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {lockers.map((l) => {
              const mine = !!user && l.occupied_by === user.id;
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

      <Dialog open={!!claimTarget} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>תפיסת לוקר {claimTarget?.number}</DialogTitle>
            <DialogDescription>
              הזן את קוד הנעילה שתשתמש בו לנעילת הלוקר. הקוד יישמר במערכת לטובת המנהלים בלבד.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="locker-pin">קוד נעילה</Label>
            <Input
              id="locker-pin"
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
            <Button onClick={claim} disabled={claimLocker.isPending}>
              {claimLocker.isPending ? "תופס..." : "תפוס לוקר"}
            </Button>
            <Button variant="outline" onClick={closeDialog}>ביטול</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Lockers;
