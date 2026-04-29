import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SiteNav from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface Post {
  id: string; title: string; content: string;
  cover_image_url: string | null; author_name: string; created_at: string;
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase.from("blog_posts").select("*").eq("slug", slug).maybeSingle()
      .then(({ data }) => { if (data) setPost(data); else setNotFound(true); });
  }, [slug]);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SiteNav />
      <main className="container mx-auto max-w-3xl px-6 py-12">
        <Link to="/blog"><Button variant="ghost" size="sm" className="mb-6 gap-1.5"><ArrowRight className="h-4 w-4" />חזרה לבלוג</Button></Link>
        {notFound && <p className="rounded-lg border border-border bg-card p-8 text-center">הפוסט לא נמצא</p>}
        {post && (
          <article>
            {post.cover_image_url && <img src={post.cover_image_url} alt={post.title} className="mb-6 w-full rounded-2xl object-cover" />}
            <h1 className="mb-3 text-4xl font-black leading-tight md:text-5xl">{post.title}</h1>
            <p className="mb-8 text-sm text-muted-foreground">מאת {post.author_name} · {new Date(post.created_at).toLocaleDateString("he-IL")}</p>
            <div className="prose prose-lg max-w-none whitespace-pre-wrap text-foreground">{post.content}</div>
          </article>
        )}
      </main>
    </div>
  );
};

export default BlogPost;
