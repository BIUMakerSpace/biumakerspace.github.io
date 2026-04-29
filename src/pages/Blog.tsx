import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SiteNav from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

interface Post {
  id: string; slug: string; title: string; content: string;
  cover_image_url: string | null; author_name: string;
  user_id: string; created_at: string;
}

const postSchema = z.object({
  title: z.string().trim().min(3).max(200),
  content: z.string().trim().min(20).max(20000),
});

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "post";

const Blog = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => supabase.from("blog_posts").select("*").order("created_at", { ascending: false })
    .then(({ data }) => setPosts(data ?? []));
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/auth"); return; }
    const parsed = postSchema.safeParse({ title, content });
    if (!parsed.success) { toast.error("כותרת לפחות 3 תווים, תוכן לפחות 20"); return; }
    setSubmitting(true);
    try {
      let coverUrl: string | null = null;
      if (cover) {
        const path = `${user.id}/${Date.now()}-${cover.name}`;
        const { error: upErr } = await supabase.storage.from("blog-images").upload(path, cover);
        if (upErr) throw upErr;
        coverUrl = supabase.storage.from("blog-images").getPublicUrl(path).data.publicUrl;
      }
      const meta = (user.user_metadata ?? {}) as Record<string, string>;
      const author = meta.full_name || meta.name || user.email || "מייקר";
      const slug = `${slugify(parsed.data.title)}-${Date.now().toString(36)}`;
      const { error } = await supabase.from("blog_posts").insert({
        user_id: user.id, author_name: author,
        title: parsed.data.title, content: parsed.data.content,
        cover_image_url: coverUrl, slug,
      });
      if (error) throw error;
      toast.success("הפוסט פורסם!");
      setTitle(""); setContent(""); setCover(null); setComposing(false);
      load();
    } catch (err) {
      toast.error("שגיאה", { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm("למחוק פוסט זה?")) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("נמחק"); load(); }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SiteNav />
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
            <Link to="/auth"><Button variant="outline">התחבר כדי לכתוב</Button></Link>
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
              <input id="b-cover" type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
            </div>
            <div>
              <Label htmlFor="b-content">תוכן</Label>
              <Textarea id="b-content" value={content} onChange={(e) => setContent(e.target.value)} rows={10} required
                placeholder="כתבו על הפרויקט שלכם, אתגרים, פתרונות, השראה..." />
              <p className="mt-1 text-xs text-muted-foreground">טיפ: ניתן להדביק קישורי תמונות בתוך הטקסט (markdown)</p>
            </div>
            <Button type="submit" disabled={submitting} size="lg">{submitting ? "מפרסם..." : "פרסם פוסט"}</Button>
          </form>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          {posts.length === 0 && <p className="col-span-full rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">עדיין אין פוסטים. היו הראשונים!</p>}
          {posts.map((p) => (
            <article key={p.id} className="overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg">
              <Link to={`/blog/${p.slug}`}>
                {p.cover_image_url && <img src={p.cover_image_url} alt={p.title} className="h-48 w-full object-cover" />}
                <div className="p-5">
                  <h2 className="text-xl font-bold leading-tight">{p.title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground whitespace-pre-wrap">{p.content}</p>
                  <p className="mt-3 text-xs text-muted-foreground">{p.author_name} · {new Date(p.created_at).toLocaleDateString("he-IL")}</p>
                </div>
              </Link>
              {(user?.id === p.user_id || isAdmin) && (
                <div className="border-t border-border px-5 py-2">
                  <Button size="sm" variant="ghost" onClick={() => deletePost(p.id)} className="gap-1.5 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />מחק
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Blog;
