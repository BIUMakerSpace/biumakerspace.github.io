import { useState, type FormEvent } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ConfirmButton from "@/components/ConfirmButton";
import { NotFoundState, PageLoading } from "@/components/layout/PageStates";
import { ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateReply, useDeleteQuestion, useDeleteReply, useForumThread } from "@/lib/queries/community";
import { errorMessage } from "@/lib/errors";
import { formatDateHe } from "@/lib/format";

const ForumThread = () => {
  const { id = "" } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useForumThread(id);
  const createReply = useCreateReply(id);
  const deleteReply = useDeleteReply();
  const deleteQuestion = useDeleteQuestion();
  const [body, setBody] = useState("");

  const question = data?.question;
  const replies = data?.replies ?? [];
  const canModerate = (authorId: string) => user?.id === authorId || isAdmin;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (body.trim().length < 2) { toast.error("תשובה קצרה מדי"); return; }
    try {
      await createReply.mutateAsync({ userId: user.id, body: body.trim() });
      setBody("");
    } catch (err) {
      toast.error("שגיאה", { description: errorMessage(err) });
    }
  };

  const onDeleteReply = async (replyId: string) => {
    try {
      await deleteReply.mutateAsync(replyId);
    } catch (err) {
      toast.error("שגיאה", { description: errorMessage(err) });
    }
  };

  const onDeleteQuestion = async () => {
    try {
      await deleteQuestion.mutateAsync(id);
      toast.success("השאלה נמחקה");
      navigate("/forum", { replace: true });
    } catch (err) {
      toast.error("שגיאה", { description: errorMessage(err) });
    }
  };

  return (
    <main className="container mx-auto max-w-3xl px-6 py-12">
      <Button asChild variant="ghost" size="sm" className="mb-6 gap-1.5">
        <Link to="/forum"><ArrowRight className="h-4 w-4" />חזרה לפורום</Link>
      </Button>
      {isLoading ? (
        <PageLoading />
      ) : !question ? (
        <NotFoundState
          message={isError ? "שגיאה בטעינת השאלה" : "השאלה לא נמצאה"}
          backTo="/forum"
          backLabel="לכל השאלות"
        />
      ) : (
        <>
          <article className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-3xl font-black leading-tight">{question.title}</h1>
              {canModerate(question.user_id) && (
                <ConfirmButton
                  title="למחוק את השאלה?"
                  description="השאלה וכל התשובות שלה יימחקו."
                  confirmLabel="מחק"
                  onConfirm={onDeleteQuestion}
                  trigger={
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="מחק שאלה">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  }
                />
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{question.author_name} · {formatDateHe(question.created_at)}</p>
            <p className="mt-4 whitespace-pre-wrap text-foreground">{question.body}</p>
          </article>

          <h2 className="mb-3 mt-8 text-xl font-bold">{replies.length} תשובות</h2>
          <div className="space-y-3">
            {replies.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-card p-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold">{r.author_name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">{formatDateHe(r.created_at)}</p>
                    {canModerate(r.user_id) && (
                      <ConfirmButton
                        title="למחוק תשובה?"
                        confirmLabel="מחק"
                        onConfirm={() => onDeleteReply(r.id)}
                        trigger={
                          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="מחק תשובה">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
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
              <Button type="submit" disabled={createReply.isPending}>{createReply.isPending ? "שולח..." : "שלח תשובה"}</Button>
            ) : (
              <Button asChild variant="outline"><Link to={`/auth?redirect=/forum/${id}`}>להתחברות</Link></Button>
            )}
          </form>
        </>
      )}
    </main>
  );
};

export default ForumThread;
