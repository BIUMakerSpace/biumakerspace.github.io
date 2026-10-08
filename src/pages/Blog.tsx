import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ConfirmButton from "@/components/ConfirmButton";
import { EmptyState, PageLoading } from "@/components/layout/PageStates";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useBlogPosts, useCreateBlogPost, useDeleteBlogPost } from "@/lib/queries/community";
import { IMAGE_ACCEPT, validateImage } from "@/lib/storage";
import { errorMessage } from "@/lib/errors";
import { formatDateHe } from "@/lib/format";

const postSchema = z.object({
  title: z.string().trim().min(3).max(200),
  content: z.string().trim().min(20).max(20000),
});

const Blog = () => {
  const { user, isAdmin } = useAuth();
  const { data: posts = [], isLoading } = useBlogPosts();
  const createPost = useCreateBlogPost();
  const deletePost = useDeleteBlogPost();
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [cover, setCover] = useState<File | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = postSchema.safeParse({ title, content });
    if (!parsed.success) { toast.error("כותרת לפחות 3 תווים, תוכן לפחות 20"); return; }
    const coverError = cover && validateImage(cover);
    if (coverError) { toast.error(coverError); return; }
    try {
      await createPost.mutateAsync({ userId: user.id, ...parsed.data, cover });
      toast.success("הפוסט פורסם!");
      setTitle(""); setContent(""); setCover(null); setComposing(false);
    } catch (err) {
      toast.error("שגיאה", { description: errorMessage(err) });
    }
  };

  const onDelete = async (post: { id: string; cover_image_url: string | null }) => {
    try {
      await deletePost.mutateAsync(post);
      toast.success("נמחק");
    } catch (err) {
      toast.error("שגיאה", { description: errorMessage(err) });
    }
  };

  return (
    <main className="container mx-auto max-w-4xl px-6 py-12">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black md:text-5xl"><span className="text-gradient">בלוג</span> מייקרים</h1>
          <p className="mt-2 text-muted-foreground">סיפורים ופרויקטים מהקהילה</p>
        </div>
        {user ? (
          <Button onClick={() => setComposing((v) => !v)} className="gap-1.5">
            <Plus className="h-4 w-4" />{composing ? "סגור" : "פוסט חדש"}
          </Button>
        ) : (
          <Button asChild variant="outline"><Link to="/auth?redirect=/blog">התחבר כדי לכתוב</Link></Button>
        )}
      </div>

      {composing && user && (
        <form onSubmit={submit} className="mb-10 space-y-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <Label htmlFor="b-title">כותרת</Label>
            <Input id="b-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
          </div>
          <div>
            <Label htmlFor="b-cover">תמונת שער (לא חובה)</Label>
            <input id="b-cover" type="file" accept={IMAGE_ACCEPT} onChange={(e) => setCover(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
          </div>
          <div>
            <Label htmlFor="b-content">תוכן</Label>
            <Textarea id="b-content" value={content} onChange={(e) => setContent(e.target.value)} rows={10} required
              placeholder="כתבו על הפרויקט שלכם, אתגרים, פתרונות, השראה..." />
          </div>
          <Button type="submit" disabled={createPost.isPending} size="lg">{createPost.isPending ? "מפרסם..." : "פרסם פוסט"}</Button>
        </form>
      )}

      {isLoading ? <PageLoading /> : (
        <div className="grid gap-6 sm:grid-cols-2">
          {posts.length === 0 && <EmptyState className="col-span-full">עדיין אין פוסטים. היו הראשונים!</EmptyState>}
          {posts.map((p) => (
            <article key={p.id} className="overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg">
              <Link to={`/blog/${p.slug}`}>
                {p.cover_image_url && <img src={p.cover_image_url} alt={p.title} className="h-48 w-full object-cover" loading="lazy" />}
                <div className="p-5">
                  <h2 className="text-xl font-bold leading-tight">{p.title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground whitespace-pre-wrap">{p.content}</p>
                  <p className="mt-3 text-xs text-muted-foreground">{p.author_name} · {formatDateHe(p.created_at)}</p>
                </div>
              </Link>
              {(user?.id === p.user_id || isAdmin) && (
                <div className="border-t border-border px-5 py-2">
                  <ConfirmButton
                    title="למחוק פוסט זה?"
                    confirmLabel="מחק"
                    onConfirm={() => onDelete(p)}
                    trigger={
                      <Button size="sm" variant="ghost" className="gap-1.5 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />מחק
                      </Button>
                    }
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
};

export default Blog;
