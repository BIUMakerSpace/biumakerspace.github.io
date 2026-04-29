import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SiteNav from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

interface Question {
  id: string; title: string; body: string; author_name: string;
  created_at: string; user_id: string;
  forum_replies: { count: number }[];
}

const qSchema = z.object({
  title: z.string().trim().min(5).max(200),
  body: z.string().trim().min(10).max(5000),
});

const Forum = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [qs, setQs] = useState<Question[]>([]);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => supabase.from("forum_questions")
    .select("*, forum_replies(count)")
    .order("created_at", { ascending: false })
    .then(({ data }) => setQs((data as Question[]) ?? []));
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/auth"); return; }
    const parsed = qSchema.safeParse({ title, body });
    if (!parsed.success) { toast.error("כותרת לפחות 5 תווים, תיאור לפחות 10"); return; }
    setSubmitting(true);
    try {
      const meta = (user.user_metadata ?? {}) as Record<string, string>;
      const author = meta.full_name || meta.name || user.email || "מייקר";
      const { error } = await supabase.from("forum_questions").insert({
        user_id: user.id, author_name: author,
        title: parsed.data.title, body: parsed.data.body,
      });
      if (error) throw error;
      toast.success("השאלה פורסמה!");
      setTitle(""); setBody(""); setComposing(false);
      load();
    } catch (err) {
      toast.error("שגיאה", { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SiteNav />
      <main className="container mx-auto max-w-4xl px-6 py-12">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-black md:text-5xl"><span className="text-gradient">פורום</span> שאלות</h1>
            <p className="mt-2 text-muted-foreground">תקועים? שאלו את הקהילה</p>
          </div>
          {user ? (
            <Button onClick={() => setComposing((v) => !v)} className="gap-1.5">
              <Plus className="h-4 w-4" />{composing ? "סגור" : "שאלה חדשה"}
            </Button>
          ) : (
            <Link to="/auth"><Button variant="outline">התחבר כדי לשאול</Button></Link>
          )}
        </div>

        {composing && user && (
          <form onSubmit={submit} className="mb-10 space-y-4 rounded-2xl border border-border bg-card p-6">
            <div>
              <Label htmlFor="q-title">כותרת השאלה</Label>
              <Input id="q-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200}
                placeholder="לדוגמה: איך מחברים סנסור DHT22 לארדואינו?" />
            </div>
            <div>
              <Label htmlFor="q-body">פירוט</Label>
              <Textarea id="q-body" value={body} onChange={(e) => setBody(e.target.value)} rows={6} required
                placeholder="תארו את הבעיה, מה ניסיתם, מה לא עובד..." />
            </div>
            <Button type="submit" disabled={submitting}>{submitting ? "מפרסם..." : "פרסם שאלה"}</Button>
          </form>
        )}

        <div className="space-y-3">
          {qs.length === 0 && <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">אין שאלות עדיין. היו הראשונים!</p>}
          {qs.map((q) => (
            <Link key={q.id} to={`/forum/${q.id}`}
              className="block rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-lg font-bold">{q.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{q.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{q.author_name} · {new Date(q.created_at).toLocaleDateString("he-IL")}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  {q.forum_replies?.[0]?.count ?? 0}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Forum;
