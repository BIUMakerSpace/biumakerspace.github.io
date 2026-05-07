import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Tpl { id: string; key: string; label: string; subject: string; body: string; }

export default function EmailTemplatesManager() {
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [edits, setEdits] = useState<Record<string, { subject: string; body: string }>>({});

  const load = async () => {
    const { data } = await supabase.from("email_templates").select("*").order("key");
    setTpls((data ?? []) as Tpl[]);
  };
  useEffect(() => { load(); }, []);

  const save = async (t: Tpl) => {
    const e = edits[t.id] ?? { subject: t.subject, body: t.body };
    const { error } = await supabase.from("email_templates")
      .update({ subject: e.subject, body: e.body }).eq("id", t.id);
    if (error) toast.error(error.message);
    else { toast.success("נשמר"); load(); }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        השתמש ב-<code className="rounded bg-muted px-1">{"{first_name}"}</code> כדי להחליף בשם הפרטי של המשתמש.
      </p>
      {tpls.map((t) => {
        const e = edits[t.id] ?? { subject: t.subject, body: t.body };
        return (
          <div key={t.id} className="space-y-2 rounded-lg border border-border bg-card p-4">
            <h3 className="font-bold">{t.label} <span className="text-xs font-normal text-muted-foreground">({t.key})</span></h3>
            <div>
              <Label>נושא</Label>
              <Input value={e.subject} onChange={(ev) => setEdits({ ...edits, [t.id]: { ...e, subject: ev.target.value } })} />
            </div>
            <div>
              <Label>תוכן</Label>
              <Textarea rows={6} value={e.body} onChange={(ev) => setEdits({ ...edits, [t.id]: { ...e, body: ev.target.value } })} />
            </div>
            <Button size="sm" onClick={() => save(t)}>שמור</Button>
          </div>
        );
      })}
    </div>
  );
}
