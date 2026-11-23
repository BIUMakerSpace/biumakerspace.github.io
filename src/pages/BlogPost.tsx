import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { NotFoundState, PageLoading } from "@/components/layout/PageStates";
import { ArrowRight } from "lucide-react";
import { useBlogPost } from "@/lib/queries/community";
import { formatDateHe } from "@/lib/format";

const BlogPost = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const { data: post, isLoading, isError } = useBlogPost(slug);

  return (
    <main className="container mx-auto max-w-3xl px-6 py-12">
      <Button asChild variant="ghost" size="sm" className="mb-6 gap-1.5">
        <Link to="/blog"><ArrowRight className="h-4 w-4" />חזרה לבלוג</Link>
      </Button>
      {isLoading ? (
        <PageLoading />
      ) : !post ? (
        <NotFoundState
          message={isError ? "שגיאה בטעינת הפוסט" : "הפוסט לא נמצא"}
          backTo="/blog"
          backLabel="לכל הפוסטים"
        />
      ) : (
        <article>
          {post.cover_image_url && <img src={post.cover_image_url} alt={post.title} className="mb-6 w-full rounded-2xl object-cover" />}
          <h1 className="mb-3 text-4xl font-black leading-tight md:text-5xl">{post.title}</h1>
          <p className="mb-8 text-sm text-muted-foreground">מאת {post.author_name} · {formatDateHe(post.created_at)}</p>
          <div className="text-lg leading-relaxed whitespace-pre-wrap text-foreground">{post.content}</div>
        </article>
      )}
    </main>
  );
};

export default BlogPost;
