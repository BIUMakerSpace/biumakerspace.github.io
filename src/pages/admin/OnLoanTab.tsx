import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/layout/PageStates";
import ReturnDialog from "@/components/admin/ReturnDialog";
import { AlertTriangle, Search } from "lucide-react";
import { useLendRequests, type LendRequest } from "@/lib/queries/admin";
import { LONG_LOAN_DAYS } from "@/lib/requestStates";
import { daysSince, formatDateHe } from "@/lib/format";

/** Everything currently out on loan, with overdue flags. */
const OnLoanTab = () => {
  const { data: requests = [] } = useLendRequests();
  const [search, setSearch] = useState("");
  const [returnFor, setReturnFor] = useState<LendRequest | null>(null);

  const onLoan = requests.filter((r) => r.status === "delivered");
  const q = search.trim().toLowerCase();
  const filtered = q
    ? onLoan.filter((r) =>
        r.requester_name.toLowerCase().includes(q) ||
        r.requester_email.toLowerCase().includes(q) ||
        r.requester_phone.toLowerCase().includes(q) ||
        r.lend_request_items.some((li) => li.catalog_items?.name.toLowerCase().includes(q)))
    : onLoan;
  const totalItems = filtered.reduce((sum, r) => sum + r.lend_request_items.reduce((s, li) => s + li.quantity, 0), 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm sm:flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם, אימייל, טלפון או פריט..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">{filtered.length} השאלות · {totalItems} פריטים</p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>אין ציוד מושאל כרגע</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-muted/50 text-right">
              <tr>
                <th className="p-3 font-semibold">שואל</th>
                <th className="p-3 font-semibold">קשר</th>
                <th className="p-3 font-semibold">פריטים</th>
                <th className="p-3 font-semibold">תאריך מסירה</th>
                <th className="p-3 font-semibold">פעולה</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const days = daysSince(r.delivered_at);
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-medium">{r.requester_name}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      <div>{r.requester_email}</div>
                      <div>{r.requester_phone}</div>
                    </td>
                    <td className="p-3">
                      <ul className="space-y-0.5">
                        {r.lend_request_items.map((li) => (
                          <li key={li.id}>• {li.catalog_items?.name} × {li.quantity}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="p-3 text-xs">
                      {r.delivered_at ? (
                        <div className="flex flex-col gap-1">
                          <span>{formatDateHe(r.delivered_at)}</span>
                          {days > LONG_LOAN_DAYS && (
                            <Badge variant="destructive" className="w-fit gap-1 text-[10px]">
                              <AlertTriangle className="h-3 w-3" />מעל {LONG_LOAN_DAYS} ימים ({days})
                            </Badge>
                          )}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="p-3">
                      <Button size="sm" variant="outline" onClick={() => setReturnFor(r)}>סמן כהוחזר</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {returnFor && (
        <ReturnDialog onClose={() => setReturnFor(null)} requestId={returnFor.id} onReturned={() => undefined} />
      )}
    </div>
  );
};

export default OnLoanTab;
