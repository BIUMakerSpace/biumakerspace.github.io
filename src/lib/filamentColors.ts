import { supabase } from "@/integrations/supabase/client";

export interface FilamentColor {
  id: string;
  name: string;
  hex: string | null;
  is_active: boolean;
  sort_order: number;
}

export async function fetchActiveFilamentColors(): Promise<FilamentColor[]> {
  const { data, error } = await supabase
    .from("filament_colors")
    .select("id, name, hex, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FilamentColor[];
}

export async function fetchAllFilamentColors(): Promise<FilamentColor[]> {
  const { data, error } = await supabase
    .from("filament_colors")
    .select("id, name, hex, is_active, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FilamentColor[];
}
