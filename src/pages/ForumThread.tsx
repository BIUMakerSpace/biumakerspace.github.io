import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SiteNav from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string; title: string; body: string; author_name: string;
  user_id: string; created_at: string;
}
interface Reply {
  id: string; body: string; author_name: string;
  user_id: string; created_at: string;
}

const ForumThread = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState<Question | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data: qData } = await supabase.from("forum_questions").select("*").eq("id", id).maybeSingle();
    setQ(qData);
    const { data: rData } = await supabase.from("forum_replies").select("*").eq("question_id", id).order("created_at");
    setReplies(rData ?? []);
  };
  useEffect(() => { load(); }, [id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/auth"); return; }
    if (body.trim().length < 2) { toast.error("תשובה קצרה מדי"); return; }
    setSubmitting(true);
    try {
      const meta = (user.user_metadata ?? {}) as Record<string, string>;
      const author = meta.full_name || meta.name || user.email || "מייקר";
      const { error } = await supabase.from("forum_replies").insert({
        question_id: id, user_id: user.id, author_name: author, body: body.trim(),
      });
      if (error) throw error;
      setBody("");
      load();
    } catch (err) {
      toast.error("שגיאה", { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteReply = async (rid: string) => {
    if (!confirm("למחוק תשובה?")) return;
    const { error } = await supabase.from("forum_replies").delete().eq("id", rid);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SiteNav />
      <main className="container mx-auto max-w-3xl px-6 py-12">
        <Link to="/forum"><Button variant="ghost" size="sm" className="mb-6 gap-1.5"><ArrowRight className="h-4 w-4" />חזרה לפורום</Button></Link>
        {!q ? <p>טוען...</p> : (
          <>
            <article className="rounded-2xl border border-border bg-card p-6">
              <h1 className="text-3xl font-black leading-tight">{q.title}</h1>
              <p className="mt-1 text-xs text-muted-foreground">{q.author_name} · {new Date(q.created_at).toLocaleDateString("he-IL")}</p>
              <p className="mt-4 whitespace-pre-wrap text-foreground">{q.body}</p>
            </article>

            <h2 className="mb-3 mt-8 text-xl font-bold">{replies.length} תשובות</h2>
            <div className="space-y-3">
              {replies.map((r) => (
                <div key={r.id} className="rounded-lg border border-border bg-card p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">{r.author_name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("he-IL")}</p>
                      {(user?.id === r.user_id || isAdmin) && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteReply(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{r.body}</p>
                </div>
              ))}
            </div>

            <form onSubmit={submit} className="mt-8 space-y-3 rounded-2xl border border-border bg-card p-6">
              <Label htmlFor="reply-body">{user ? "התשובה שלך" : "התחבר כדי להגיב"}</Label>
              <Textarea id="reply-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} disabled={!user} maxLength={5000} />
              {user ? (
                <Button type="submit" disabled={submitting}>{submitting ? "שולח..." : "שלח תשובה"}</Button>
              ) : (
                <Link to="/auth"><Button variant="outline">להתחברות</Button></Link>
              )}
            </form>
          </>
        )}
      </main>
    </div>
  );
};

export default ForumThread;
