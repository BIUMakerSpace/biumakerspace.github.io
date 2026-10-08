import { EmptyState } from "@/components/layout/PageStates";
import { toast } from "sonner";
import { useItemRequests, useUpdateRequestStatus } from "@/lib/queries/admin";
import { statusLabel, statusOptions } from "@/lib/requestStates";
import { formatDateHe } from "@/lib/format";
import { safeUrl } from "@/lib/url";
import { errorMessage } from "@/lib/errors";

/** Users' requests to buy new equipment. */
const ItemRequestsTab = () => {
  const { data: requests = [] } = useItemRequests();
  const updateStatus = useUpdateRequestStatus("item_requests");

  const setStatus = async (id: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast.success("עודכן");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="space-y-3">
      {requests.length === 0 && <EmptyState>אין בקשות לפריטים חדשים</EmptyState>}
      {requests.map((r) => {
        const link = safeUrl(r.reference_link);
        return (
          <div key={r.id} className="rounded-lg border border-border bg-card p-4 sm:p-5">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold break-words">{r.item_name}</h3>
                <p className="text-xs text-muted-foreground break-words">{r.requester_name} · {r.requester_email} · {r.requester_phone} · {formatDateHe(r.created_at)}</p>
              </div>
              <select
                value={r.status}
                onChange={(e) => setStatus(r.id, e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                aria-label="סטטוס"
              >
                {statusOptions("item").map((s) => <option key={s} value={s}>{statusLabel("item", s)}</option>)}
              </select>
            </div>
            {r.description && <p className="text-sm whitespace-pre-wrap"><strong>תיאור:</strong> {r.description}</p>}
            {link && (
              <a href={link} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm text-primary underline">
                קישור לפריט
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ItemRequestsTab;
