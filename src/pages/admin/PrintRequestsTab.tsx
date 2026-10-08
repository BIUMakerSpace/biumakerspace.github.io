import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/PageStates";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { usePrintRequests, useUpdateRequestStatus, type PrintRequest } from "@/lib/queries/admin";
import { PRINT_EMAIL_KEY, nextPrintStatuses, statusBadgeVariant, statusLabel } from "@/lib/requestStates";
import { formatDateHe } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { StatusFilter, TransitionButtons } from "./shared";
import { useEmailPrompt } from "./useEmailPrompt";

const PrintRequestsTab = () => {
  const { data: requests = [] } = usePrintRequests();
  const updateStatus = useUpdateRequestStatus("print_requests");
  const { promptEmail, emailDialog } = useEmailPrompt();
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  const transition = (req: PrintRequest, next: string) => {
    const apply = async () => {
      await updateStatus.mutateAsync({ id: req.id, status: next });
      toast.success("עודכן");
    };
    const templateKey = PRINT_EMAIL_KEY[next];
    if (templateKey) promptEmail({ templateKey, email: req.requester_email, name: req.requester_name, onConfirm: apply });
    else apply().catch((e) => toast.error(errorMessage(e)));
  };

  const downloadStl = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from("stl-files").createSignedUrl(path, 60, { download: name });
    if (error || !data) { toast.error("שגיאה בהורדה"); return; }
    window.location.href = data.signedUrl;
  };

  return (
    <div className="space-y-3">
      <StatusFilter kind="print" rows={requests} value={filter} onChange={setFilter} />
      {filtered.length === 0 && <EmptyState>אין בקשות</EmptyState>}
      {filtered.map((r) => (
        <div key={r.id} className="rounded-lg border border-border bg-card p-4 sm:p-5">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold">{r.requester_name}</h3>
              <p className="text-xs text-muted-foreground break-words">{r.requester_email} · {r.requester_phone} · {formatDateHe(r.created_at)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={statusBadgeVariant(r.status)}>{statusLabel("print", r.status)}</Badge>
              <TransitionButtons kind="print" current={r.status} next={nextPrintStatuses(r.status)} onSelect={(n) => transition(r, n)} />
            </div>
          </div>
          <p className="text-sm"><strong>מטרה:</strong> {r.purpose}</p>
          <p className="text-sm"><strong>צבע:</strong> {r.filament_color}</p>
          <Button size="sm" variant="outline" className="mt-2 gap-1.5" onClick={() => downloadStl(r.stl_file_path, r.stl_file_name)}>
            <Download className="h-3.5 w-3.5" />{r.stl_file_name}
          </Button>
        </div>
      ))}
      {emailDialog}
    </div>
  );
};

export default PrintRequestsTab;
