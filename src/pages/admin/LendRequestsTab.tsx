import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/PageStates";
import DeliverDialog from "@/components/admin/DeliverDialog";
import ReturnDialog from "@/components/admin/ReturnDialog";
import { toast } from "sonner";
import { deliverItemsOf, useLendRequests, useUpdateRequestStatus, type LendRequest } from "@/lib/queries/admin";
import { LEND_EMAIL_KEY, nextLendStatuses, statusBadgeVariant, statusLabel } from "@/lib/requestStates";
import { formatDateHe } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { StatusFilter, TransitionButtons } from "./shared";
import { useEmailPrompt } from "./useEmailPrompt";

const LendRequestsTab = () => {
  const { data: requests = [] } = useLendRequests();
  const updateStatus = useUpdateRequestStatus("lend_requests");
  const { promptEmail, emailDialog } = useEmailPrompt();
  const [filter, setFilter] = useState("all");
  const [deliverFor, setDeliverFor] = useState<LendRequest | null>(null);
  const [returnFor, setReturnFor] = useState<LendRequest | null>(null);
  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  const transition = (req: LendRequest, next: string) => {
    // Delivery and return move stock, so they have their own dialogs and RPCs.
    if (next === "delivered") { setDeliverFor(req); return; }
    if (next === "returned") { setReturnFor(req); return; }
    const apply = async () => {
      await updateStatus.mutateAsync({ id: req.id, status: next });
      toast.success("עודכן");
    };
    const templateKey = LEND_EMAIL_KEY[next];
    if (templateKey) promptEmail({ templateKey, email: req.requester_email, name: req.requester_name, onConfirm: apply });
    else apply().catch((e) => toast.error(errorMessage(e)));
  };

  return (
    <div className="space-y-3">
      <StatusFilter kind="lend" rows={requests} value={filter} onChange={setFilter} />
      {filtered.length === 0 && <EmptyState>אין בקשות</EmptyState>}
      {filtered.map((r) => (
        <div key={r.id} className="rounded-lg border border-border bg-card p-4 sm:p-5">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold">{r.requester_name}</h3>
              <p className="text-xs text-muted-foreground break-words">{r.requester_email} · {r.requester_phone} · {formatDateHe(r.created_at)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={statusBadgeVariant(r.status)}>{statusLabel("lend", r.status)}</Badge>
              <TransitionButtons kind="lend" current={r.status} next={nextLendStatuses(r.status)} onSelect={(n) => transition(r, n)} />
            </div>
          </div>
          <ul className="text-sm">
            {r.lend_request_items.map((li) => (
              <li key={li.id}>• {li.catalog_items?.name} × {li.quantity}</li>
            ))}
          </ul>
          {r.notes && <p className="mt-2 text-sm"><strong>הערות:</strong> {r.notes}</p>}
          {r.delivered_at && <p className="mt-1 text-xs text-muted-foreground">נמסר: {formatDateHe(r.delivered_at)}</p>}
          {r.returned_at && <p className="text-xs text-muted-foreground">הוחזר: {formatDateHe(r.returned_at)}</p>}
        </div>
      ))}

      {deliverFor && (
        <DeliverDialog
          onClose={() => setDeliverFor(null)}
          requestId={deliverFor.id}
          items={deliverItemsOf(deliverFor)}
          onDelivered={() =>
            // Already delivered; the email is optional, so "skip" has nothing left to apply.
            promptEmail({
              templateKey: LEND_EMAIL_KEY.delivered,
              email: deliverFor.requester_email,
              name: deliverFor.requester_name,
              onConfirm: () => undefined,
            })
          }
        />
      )}
      {returnFor && (
        <ReturnDialog onClose={() => setReturnFor(null)} requestId={returnFor.id} onReturned={() => undefined} />
      )}
      {emailDialog}
    </div>
  );
};

export default LendRequestsTab;
