import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState, PageLoading } from "@/components/layout/PageStates";
import { MessageSquare, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useCreateQuestion, useForumQuestions } from "@/lib/queries/community";
import { errorMessage } from "@/lib/errors";
import { formatDateHe } from "@/lib/format";

const qSchema = z.object({
  title: z.string().trim().min(5).max(200),
  body: z.string().trim().min(10).max(5000),
});

const Forum = () => {
  const { user } = useAuth();
  const { data: questions = [], isLoading } = useForumQuestions();
  const createQuestion = useCreateQuestion();
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = qSchema.safeParse({ title, body });
    if (!parsed.success) { toast.error("כותרת לפחות 5 תווים, תיאור לפחות 10"); return; }
    try {
      await createQuestion.mutateAsync({ userId: user.id, ...parsed.data });
      toast.success("השאלה פורסמה!");
      setTitle(""); setBody(""); setComposing(false);
    } catch (err) {
      toast.error("שגיאה", { description: errorMessage(err) });
    }
  };

  return (
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
          <Button asChild variant="outline"><Link to="/auth?redirect=/forum">התחבר כדי לשאול</Link></Button>
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
          <Button type="submit" disabled={createQuestion.isPending}>{createQuestion.isPending ? "מפרסם..." : "פרסם שאלה"}</Button>
        </form>
      )}

      {isLoading ? <PageLoading /> : (
        <div className="space-y-3">
          {questions.length === 0 && <EmptyState>אין שאלות עדיין. היו הראשונים!</EmptyState>}
          {questions.map((q) => (
            <Link key={q.id} to={`/forum/${q.id}`}
              className="block rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-lg font-bold">{q.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{q.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{q.author_name} · {formatDateHe(q.created_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  {q.forum_replies?.[0]?.count ?? 0}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
};

export default Forum;
