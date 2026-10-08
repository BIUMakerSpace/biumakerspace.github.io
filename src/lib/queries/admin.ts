import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { unwrap } from "@/lib/errors";
import { publicUrlToPath, removeFiles, uploadPublicImage } from "@/lib/storage";
import type { CatalogCsvRecord } from "@/lib/csv";
import { queryKeys } from "./keys";

export type CatalogItem = Tables<"catalog_items">;
export type ItemSource = Tables<"item_sources">;
export type CatalogItemSource = Tables<"catalog_item_sources">;
export type PrintRequest = Tables<"print_requests">;
export type ItemRequest = Tables<"item_requests">;

const LEND_SELECT = "*, lend_request_items(id, item_id, quantity, catalog_items(name))" as const;

/** Anything that changes stock or the catalog refreshes every view of it. */
export function invalidateInventory(qc: QueryClient) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.catalogItems }),
    qc.invalidateQueries({ queryKey: queryKeys.catalogItemSources }),
    qc.invalidateQueries({ queryKey: queryKeys.itemSources }),
    qc.invalidateQueries({ queryKey: queryKeys.admin.lendRequests }),
  ]);
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useItemSources() {
  return useQuery({
    queryKey: queryKeys.itemSources,
    queryFn: async () =>
      unwrap(await supabase.from("item_sources").select("*").order("sort_order").order("name"), []),
  });
}

export function useCatalogItemSources() {
  return useQuery({
    queryKey: queryKeys.catalogItemSources,
    queryFn: async () => unwrap(await supabase.from("catalog_item_sources").select("*"), []),
  });
}

export function usePrintRequests() {
  return useQuery({
    queryKey: queryKeys.admin.printRequests,
    queryFn: async () =>
      unwrap(await supabase.from("print_requests").select("*").order("created_at", { ascending: false }), []),
  });
}

async function fetchLendRequests() {
  return unwrap(
    await supabase.from("lend_requests").select(LEND_SELECT).order("created_at", { ascending: false }),
    [],
  );
}
export type LendRequest = Awaited<ReturnType<typeof fetchLendRequests>>[number];

/** Line items of a lend request in the shape DeliverDialog expects. */
export const deliverItemsOf = (req: LendRequest) =>
  req.lend_request_items.map((li) => ({
    id: li.id,
    item_id: li.item_id,
    quantity: li.quantity,
    name: li.catalog_items?.name ?? "",
  }));

export function useLendRequests() {
  return useQuery({ queryKey: queryKeys.admin.lendRequests, queryFn: fetchLendRequests });
}

export function useItemRequests() {
  return useQuery({
    queryKey: queryKeys.admin.itemRequests,
    queryFn: async () =>
      unwrap(await supabase.from("item_requests").select("*").order("created_at", { ascending: false }), []),
  });
}

export interface AdminUser extends Tables<"profiles"> {
  role: "admin" | "user";
}

export function useAdminUsers() {
  return useQuery({
    queryKey: queryKeys.admin.users,
    queryFn: async (): Promise<AdminUser[]> => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const admins = new Set(unwrap(roles, []).filter((r) => r.role === "admin").map((r) => r.user_id));
      return unwrap(profiles, []).map((p) => ({ ...p, role: admins.has(p.id) ? "admin" : "user" }));
    },
  });
}

// ---------------------------------------------------------------------------
// Request status
// ---------------------------------------------------------------------------

const STATUS_QUERY = {
  print_requests: queryKeys.admin.printRequests,
  lend_requests: queryKeys.admin.lendRequests,
  item_requests: queryKeys.admin.itemRequests,
} as const;

/** Plain status changes. Delivery and return go through the deliver/return RPCs instead. */
export function useUpdateRequestStatus(table: keyof typeof STATUS_QUERY) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from(table).update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: STATUS_QUERY[table] }),
  });
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export async function ensureItemSource(name: string): Promise<string> {
  return unwrap(await supabase.rpc("ensure_item_source", { p_name: name }));
}

export function useAddCatalogItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      items: (Omit<CatalogCsvRecord, "image_url"> & { image_url?: string | null; source_id?: string | null })[];
      image?: File | null;
    }) => {
      const upload = input.image ? await uploadPublicImage("catalog-images", null, input.image) : null;
      const items = input.items.map((it, i) => ({
        ...it,
        // A single uploaded image belongs to the single item of the add form.
        image_url: i === 0 && upload ? upload.publicUrl : it.image_url ?? null,
      }));
      const { error } = await supabase.rpc("admin_add_catalog_items", { p_items: items });
      if (error) {
        await removeFiles("catalog-images", [upload?.path]);
        throw error;
      }
    },
    onSuccess: () => invalidateInventory(qc),
  });
}

export function useUpdateCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      item: CatalogItem;
      patch: Partial<Pick<CatalogItem, "name" | "description" | "category">>;
      newImage?: File | null;
    }) => {
      const upload = input.newImage ? await uploadPublicImage("catalog-images", null, input.newImage) : null;
      const { error } = await supabase
        .from("catalog_items")
        .update({ ...input.patch, ...(upload ? { image_url: upload.publicUrl } : {}) })
        .eq("id", input.item.id);
      if (error) {
        await removeFiles("catalog-images", [upload?.path]);
        throw error;
      }
      if (upload) await removeFiles("catalog-images", [publicUrlToPath("catalog-images", input.item.image_url)]);
    },
    onSuccess: () => invalidateInventory(qc),
  });
}

/**
 * Deletes an item that was never lent; items with lending history are archived
 * instead (hidden from the catalog, kept for request history).
 */
export function useRemoveCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: CatalogItem): Promise<"deleted" | "archived"> => {
      const { error } = await supabase.from("catalog_items").delete().eq("id", item.id);
      if (!error) {
        await removeFiles("catalog-images", [publicUrlToPath("catalog-images", item.image_url)]);
        return "deleted";
      }
      if (error.code !== "23503") throw error; // foreign_key_violation: has lend history
      const { error: archiveError } = await supabase
        .from("catalog_items")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", item.id);
      if (archiveError) throw archiveError;
      return "archived";
    },
    onSuccess: () => invalidateInventory(qc),
  });
}

/** Sets an item's quantity at one source (creating the row, or deleting it at 0 when it never existed). */
export function useSetSourceQuantity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { itemId: string; sourceId: string; quantity: number; existingId?: string }) => {
      const quantity = Math.max(0, Math.floor(input.quantity));
      const { error } = input.existingId
        ? await supabase.from("catalog_item_sources").update({ quantity }).eq("id", input.existingId)
        : await supabase.from("catalog_item_sources").insert({ item_id: input.itemId, source_id: input.sourceId, quantity });
      if (error) throw error;
    },
    onSuccess: () => invalidateInventory(qc),
  });
}

export function useRemoveSourceRow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await supabase.from("catalog_item_sources").delete().eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: () => invalidateInventory(qc),
  });
}

// ---------------------------------------------------------------------------
// Lending (RPCs enforce state, stock and permissions)
// ---------------------------------------------------------------------------

export function useDeliverLendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      requestId: string;
      items: { lend_request_item_id: string; picks: { source_id: string; quantity: number }[] }[];
    }) => {
      const { error } = await supabase.rpc("deliver_lend_request", {
        p_request_id: input.requestId,
        p_items: input.items,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateInventory(qc),
  });
}

export function useReturnLendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requestId: string; overrides: { lris_id: string; source_id: string }[] }) => {
      const { error } = await supabase.rpc("return_lend_request", {
        p_request_id: input.requestId,
        p_overrides: input.overrides,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateInventory(qc),
  });
}

export function useAdminCreateLendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; notes: string; items: { item_id: string; quantity: number }[] }) => {
      const { error } = await supabase.rpc("admin_create_lend_request", {
        p_user_id: input.userId,
        p_notes: input.notes,
        p_items: input.items,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateInventory(qc),
  });
}
