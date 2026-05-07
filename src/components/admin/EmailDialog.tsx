import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  onDone: () => void; // called after send-or-skip; status update happens here
}

const firstName = (full: string) => (full?.trim().split(/\s+/)[0] ?? "");

export default function EmailDialog({
  open, onClose, templateKey, recipientEmail, recipientName, onDone,
}: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase.from("email_templates").select("subject, body").eq("key", templateKey).maybeSingle()
      .then(({ data }) => {
        const fn = firstName(recipientName);
        const re = /\{first_name\}/g;
        setSubject((data?.subject ?? "").replace(re, fn));
        setBody((data?.body ?? "").replace(re, fn));
        setLoading(false);
      });
  }, [open, templateKey, recipientName]);

  const send = () => {
    const url = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank");
    onDone();
    onClose();
  };
  const skip = () => { onDone(); onClose(); };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-w-lg">
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
          <Button onClick={send} disabled={loading || !recipientEmail} className="gap-1.5">
            <Mail className="h-4 w-4" />שליחה ועדכון סטטוס
          </Button>
          <Button variant="outline" onClick={skip} className="gap-1.5">
            <SkipForward className="h-4 w-4" />עדכן בלי לשלוח
          </Button>
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
