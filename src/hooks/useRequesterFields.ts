import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getDisplayName } from "@/lib/user";

export interface RequesterFields {
  requester_name: string;
  requester_email: string;
  requester_phone: string;
}

/** Contact fields for request forms, prefilled from the signed-in user once they're known. */
export function useRequesterFields(user: User | null) {
  const [fields, setFields] = useState<RequesterFields>({ requester_name: "", requester_email: "", requester_phone: "" });
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);

  // Adjust state during render (not in an effect) when the user first becomes available.
  if (user && prefilledFor !== user.id) {
    setPrefilledFor(user.id);
    setFields((f) => ({
      ...f,
      requester_name: f.requester_name || getDisplayName(user, ""),
      requester_email: f.requester_email || (user.email ?? ""),
    }));
  }

  const setField = (key: keyof RequesterFields, value: string) => setFields((f) => ({ ...f, [key]: value }));
  return { fields, setField };
}
