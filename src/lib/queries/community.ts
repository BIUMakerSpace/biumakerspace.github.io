import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "@/lib/errors";
import { publicUrlToPath, removeFiles, uploadPublicImage } from "@/lib/storage";
import { queryKeys } from "./keys";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "post";

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

export function useBlogPosts() {
  return useQuery({
    queryKey: queryKeys.blogPosts,
    queryFn: async () =>
      unwrap(await supabase.from("blog_posts").select("*").order("created_at", { ascending: false }), []),
  });
}

export function useBlogPost(slug: string) {
  return useQuery({
    queryKey: queryKeys.blogPost(slug),
    // null means "not found" (as opposed to a load error).
    queryFn: async () => {
      const { data, error } = await supabase.from("blog_posts").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; title: string; content: string; cover: File | null }) => {
      const upload = input.cover ? await uploadPublicImage("blog-images", input.userId, input.cover) : null;
      const { error } = await supabase.from("blog_posts").insert({
        user_id: input.userId,
        title: input.title,
        content: input.content,
        cover_image_url: upload?.publicUrl ?? null,
        slug: `${slugify(input.title)}-${Date.now().toString(36)}`,
      });
      if (error) {
        await removeFiles("blog-images", [upload?.path]);
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.blogPosts }),
  });
}

export function useDeleteBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (post: { id: string; cover_image_url: string | null }) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", post.id);
      if (error) throw error;
      await removeFiles("blog-images", [publicUrlToPath("blog-images", post.cover_image_url)]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.blogPosts }),
  });
}

// ---------------------------------------------------------------------------
// Forum
// ---------------------------------------------------------------------------

export function useForumQuestions() {
  return useQuery({
    queryKey: queryKeys.forumQuestions,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("forum_questions")
          .select("*, forum_replies(count)")
          .order("created_at", { ascending: false }),
        [],
      ),
  });
}

export function useForumThread(id: string) {
  return useQuery({
    queryKey: queryKeys.forumThread(id),
    queryFn: async () => {
      const [question, replies] = await Promise.all([
        supabase.from("forum_questions").select("*").eq("id", id).maybeSingle(),
        supabase.from("forum_replies").select("*").eq("question_id", id).order("created_at"),
      ]);
      if (question.error) throw question.error;
      return { question: question.data, replies: unwrap(replies, []) };
    },
  });
}

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; title: string; body: string }) => {
      const { error } = await supabase
        .from("forum_questions")
        .insert({ user_id: input.userId, title: input.title, body: input.body });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.forumQuestions }),
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("forum_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.forumQuestions }),
  });
}

export function useCreateReply(questionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; body: string }) => {
      const { error } = await supabase
        .from("forum_replies")
        .insert({ question_id: questionId, user_id: input.userId, body: input.body });
      if (error) throw error;
    },
    // Prefix match also refreshes the reply counts on the forum list.
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.forumQuestions }),
  });
}

export function useDeleteReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (replyId: string) => {
      const { error } = await supabase.from("forum_replies").delete().eq("id", replyId);
      if (error) throw error;
    },
    // Prefix match refreshes this thread and the reply counts on the forum list.
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.forumQuestions }),
  });
}
