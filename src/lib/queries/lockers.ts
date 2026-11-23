import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "@/lib/errors";
import { queryKeys } from "./keys";

/** Public occupancy of every locker (no PINs or occupant details). */
export function useLockersStatus(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.lockersStatus,
    enabled,
    queryFn: async () => {
      const rows = unwrap(await supabase.from("lockers_status").select("*").order("number"), []);
      // View columns are typed nullable; every row has these.
      return rows.map((r) => ({
        id: r.id!,
        number: r.number!,
        label: r.label,
        is_occupied: !!r.is_occupied,
        occupied_by: r.occupied_by,
        occupied_at: r.occupied_at,
      }));
    },
  });
}

/** The signed-in user's locker including its PIN, or null. */
export function useMyLocker(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.myLocker(userId ?? ""),
    enabled: !!userId,
    queryFn: async () => unwrap(await supabase.rpc("get_my_locker"), [])[0] ?? null,
  });
}

function useInvalidateLockers() {
  const qc = useQueryClient();
  return () => Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.lockersStatus }),
    qc.invalidateQueries({ queryKey: ["my-locker"] }),
  ]);
}

export function useClaimLocker() {
  const invalidate = useInvalidateLockers();
  return useMutation({
    mutationFn: async (input: { number: number; pin: string }) => {
      const { error } = await supabase.rpc("claim_locker", { p_number: input.number, p_pin: input.pin });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Releases the caller's own locker; a DB trigger clears the PIN and occupant fields. */
export function useReleaseLocker(userId: string | undefined) {
  const invalidate = useInvalidateLockers();
  return useMutation({
    mutationFn: async (lockerId: string) => {
      const { error } = await supabase
        .from("lockers")
        .update({ occupied_by: null })
        .eq("id", lockerId)
        .eq("occupied_by", userId ?? "");
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
