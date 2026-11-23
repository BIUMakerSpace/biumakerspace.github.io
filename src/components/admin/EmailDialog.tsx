import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, SkipForward } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  templateKey: string;
  recipientEmail: string;
  recipientName: string;
  /** Applies the status change; the email opens only after this succeeds. */
  onDone: () => Promise<void> | void;
}

const firstName = (full: string) => (full?.trim().split(/\s+/)[0] ?? "");

export default function EmailDialog({
  open, onClose, templateKey, recipientEmail, recipientName, onDone,
}: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase.from("email_templates").select("subject, body").eq("key", templateKey).maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error("שגיאה בטעינת תבנית המייל", { description: error.message });
        const fn = firstName(recipientName);
        const re = /\{first_name\}/g;
        setSubject((data?.subject ?? "").replace(re, fn));
        setBody((data?.body ?? "").replace(re, fn));
        setLoading(false);
      });
  }, [open, templateKey, recipientName]);

  // Apply the status change first so the user is never emailed about a change that failed.
  const apply = async (): Promise<boolean> => {
    setBusy(true);
    try {
      await onDone();
      return true;
    } catch (e) {
      toast.error("עדכון הסטטוס נכשל", { description: errorMessage(e) });
      return false;
    } finally {
      setBusy(false);
    }
  };
  const send = async () => {
    if (!(await apply())) return;
    // Same-tab navigation hands off to the mail client without leaving a blank tab behind.
    window.location.href = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    onClose();
  };
  const skip = async () => {
    if (await apply()) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>שליחת מייל למשתמש</DialogTitle></DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground">טוען...</p>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>אל</Label>
              <Input value={recipientEmail} disabled />
            </div>
            <div>
              <Label>נושא</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
              <Label>תוכן</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} />
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:justify-start">
          <Button onClick={send} disabled={loading || busy || !recipientEmail} className="gap-1.5">
            <Mail className="h-4 w-4" />שליחה ועדכון סטטוס
          </Button>
          <Button variant="outline" onClick={skip} disabled={busy} className="gap-1.5">
            <SkipForward className="h-4 w-4" />עדכן בלי לשלוח
          </Button>
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
