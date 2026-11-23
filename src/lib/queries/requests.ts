import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "@/lib/errors";
import { removeFiles, storagePath, uploadFile } from "@/lib/storage";
import type { RequesterFields } from "@/hooks/useRequesterFields";
import { queryKeys } from "./keys";

export function useMyRequests(userId: string) {
  return useQuery({
    queryKey: queryKeys.myRequests(userId),
    queryFn: async () => {
      const [prints, lends] = await Promise.all([
        supabase.from("print_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase
          .from("lend_requests")
          .select("*, lend_request_items(quantity, catalog_items(name))")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ]);
      return { prints: unwrap(prints, []), lends: unwrap(lends, []) };
    },
  });
}

export function useCancelRequest(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ table, id }: { table: "print_requests" | "lend_requests"; id: string }) => {
      const { error } = await supabase.from(table).update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.myRequests(userId) }),
  });
}

export function useCreatePrintRequest(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RequesterFields & { purpose: string; filament_color: string; file: File }) => {
      const { file, ...fields } = input;
      const path = storagePath(userId, file);
      await uploadFile("stl-files", path, file);
      const { error } = await supabase.from("print_requests").insert({
        ...fields,
        user_id: userId,
        stl_file_path: path,
        stl_file_name: file.name,
      });
      if (error) {
        await removeFiles("stl-files", [path]);
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.myRequests(userId) }),
  });
}

export function useCreateLendRequest(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RequesterFields & { notes: string; items: { item_id: string; quantity: number }[] }) => {
      const { error } = await supabase.rpc("create_lend_request", {
        p_requester_name: input.requester_name,
        p_requester_email: input.requester_email,
        p_requester_phone: input.requester_phone,
        p_notes: input.notes,
        p_items: input.items,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.myRequests(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.catalogItems });
    },
  });
}

export function useCreateItemRequest(userId: string) {
  return useMutation({
    mutationFn: async (input: RequesterFields & { item_name: string; description: string; reference_link: string }) => {
      const { error } = await supabase.from("item_requests").insert({
        user_id: userId,
        requester_name: input.requester_name,
        requester_email: input.requester_email,
        requester_phone: input.requester_phone,
        item_name: input.item_name,
        description: input.description || null,
        reference_link: input.reference_link || null,
      });
      if (error) throw error;
    },
  });
}
