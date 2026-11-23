import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { unwrap } from "@/lib/errors";
import { combineWorkshops, type Workshop } from "@/lib/workshops";
import { queryKeys } from "./keys";

/**
 * Workshops with their meetings and live seat counts. Visitors and students get published
 * workshops only; admins also get drafts (the database decides, via row-level security).
 */
export async function fetchWorkshops(): Promise<Workshop[]> {
  const [workshops, meetings, stats] = await Promise.all([
    supabase.from("workshops").select("*"),
    supabase.from("workshop_meetings").select("*"),
    supabase.rpc("workshop_meeting_stats"),
  ]);
  return combineWorkshops(unwrap(workshops, []), unwrap(meetings, []), unwrap(stats, []));
}

export function useWorkshops(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.workshops(userId ?? "anon"),
    queryFn: fetchWorkshops,
    enabled,
    // Seats change while the page is open: refresh every 30 s and when the tab regains focus.
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

const invalidateWorkshops = (qc: ReturnType<typeof useQueryClient>) =>
  Promise.all([
    qc.invalidateQueries({ queryKey: ["workshops"] }),
    qc.invalidateQueries({ queryKey: ["admin", "workshop-registrations"] }),
  ]);

/** Registers for, or cancels, one meeting. Capacity and timing are enforced by the database. */
export function useToggleRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ meetingId, register }: { meetingId: string; register: boolean }) => {
      const { error } = register
        ? await supabase.rpc("register_workshop_meeting", { p_meeting_id: meetingId })
        : await supabase.rpc("cancel_workshop_registration", { p_meeting_id: meetingId });
      if (error) throw error;
    },
    // Refresh even on failure: "full" usually means someone else just took the last seat.
    onSettled: () => invalidateWorkshops(qc),
  });
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export function useMeetingRegistrations(meetingId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.admin.workshopRegistrations(meetingId),
    enabled,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("workshop_registrations")
          .select("id, created_at, user_id, profiles(full_name, email, phone)")
          .eq("meeting_id", meetingId)
          .order("created_at"),
        [],
      ),
  });
}

export type WorkshopInput = Pick<
  TablesInsert<"workshops">,
  "title" | "description" | "image_url" | "notice" | "is_published" | "sort_order"
>;
export type MeetingInput = Pick<TablesInsert<"workshop_meetings">, "title" | "starts_at" | "capacity" | "is_cancelled">;

export function useSaveWorkshop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: WorkshopInput }) => {
      const { error } = id
        ? await supabase.from("workshops").update(values satisfies TablesUpdate<"workshops">).eq("id", id)
        : await supabase.from("workshops").insert(values);
      if (error) throw error;
    },
    onSuccess: () => invalidateWorkshops(qc),
  });
}

export function useDeleteWorkshop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workshops").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateWorkshops(qc),
  });
}

export function useSaveMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, workshopId, values }: { id?: string; workshopId: string; values: MeetingInput }) => {
      const { error } = id
        ? await supabase.from("workshop_meetings").update(values).eq("id", id)
        : await supabase.from("workshop_meetings").insert({ ...values, workshop_id: workshopId });
      if (error) throw error;
    },
    onSuccess: () => invalidateWorkshops(qc),
  });
}

export function useDeleteMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workshop_meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateWorkshops(qc),
  });
}

export function useRemoveRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (registrationId: string) => {
      const { error } = await supabase.from("workshop_registrations").delete().eq("id", registrationId);
      if (error) throw error;
    },
    onSuccess: () => invalidateWorkshops(qc),
  });
}
