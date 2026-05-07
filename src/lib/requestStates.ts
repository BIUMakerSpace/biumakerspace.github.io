// Forward-only state machines for print + lend requests.
// Returns the list of allowed next statuses given the current one.

export const PRINT_STATUS_HE: Record<string, string> = {
  pending: "ממתין",
  approved: "אושר",
  printing: "מדפיס",
  ready: "מוכן לאיסוף",
  completed: "הושלם",
  rejected: "נדחה",
  cancelled: "בוטל",
};

export const LEND_STATUS_HE: Record<string, string> = {
  pending: "ממתין",
  approved: "אושר",
  delivered: "נמסר",
  returned: "הוחזר",
  rejected: "נדחה",
  cancelled: "בוטל",
};

export function nextPrintStatuses(current: string): string[] {
  switch (current) {
    case "pending": return ["approved", "rejected"];
    case "approved": return ["printing", "rejected"];
    case "printing": return ["ready"];
    case "ready": return ["completed"];
    case "rejected": return ["approved"]; // only way back
    case "completed":
    case "cancelled":
    default: return [];
  }
}

export function nextLendStatuses(current: string): string[] {
  switch (current) {
    case "pending": return ["approved", "rejected"];
    case "approved": return ["delivered", "rejected"];
    case "delivered": return ["returned"];
    case "rejected": return ["approved"];
    case "returned":
    case "cancelled":
    default: return [];
  }
}

// Status → email template key (only for transitions that should prompt email).
export const PRINT_EMAIL_KEY: Record<string, string> = {
  approved: "print_approved",
  rejected: "print_rejected",
  ready: "print_ready", // "printed" / ready for pickup
};
export const LEND_EMAIL_KEY: Record<string, string> = {
  approved: "lend_approved",
  rejected: "lend_rejected",
  delivered: "lend_delivered",
};

export function statusBadgeVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "rejected" || s === "cancelled") return "destructive";
  if (s === "completed" || s === "returned") return "secondary";
  if (s === "ready" || s === "delivered" || s === "approved") return "default";
  return "outline";
}
