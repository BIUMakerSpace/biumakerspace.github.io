// Status vocabularies, labels and forward-only state machines for requests.
// The allowed values are also enforced by CHECK constraints in the database.

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

export const ITEM_REQUEST_STATUS_HE: Record<string, string> = {
  pending: "ממתין",
  approved: "אושר",
  ordered: "הוזמן",
  received: "הגיע",
  rejected: "נדחה",
};

export type RequestKind = "print" | "lend" | "item";

const LABELS: Record<RequestKind, Record<string, string>> = {
  print: PRINT_STATUS_HE,
  lend: LEND_STATUS_HE,
  item: ITEM_REQUEST_STATUS_HE,
};

export function statusLabel(kind: RequestKind, status: string): string {
  return LABELS[kind][status] ?? status;
}

/** Status values in display order, for filters and selects. */
export function statusOptions(kind: RequestKind): string[] {
  return Object.keys(LABELS[kind]);
}

/** Loans delivered longer ago than this are flagged as overdue. */
export const LONG_LOAN_DAYS = 14;

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
