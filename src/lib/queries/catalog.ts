import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "@/lib/errors";
import { fetchActiveFilamentColors, fetchAllFilamentColors } from "@/lib/filamentColors";
import { queryKeys } from "./keys";

/** Catalog items visible to the public (archived items are hidden). */
export function useCatalogItems() {
  return useQuery({
    queryKey: queryKeys.catalogItems,
    queryFn: async () =>
      unwrap(
        await supabase.from("catalog_items").select("*").is("archived_at", null).order("name"),
        [],
      ),
  });
}

export function useFilamentColors({ includeInactive = false } = {}) {
  return useQuery({
    queryKey: queryKeys.filamentColors(includeInactive),
    queryFn: includeInactive ? fetchAllFilamentColors : fetchActiveFilamentColors,
  });
}
