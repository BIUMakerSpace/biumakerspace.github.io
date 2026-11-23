import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfirmButton from "@/components/ConfirmButton";
import { EmptyState, PageLoading } from "@/components/layout/PageStates";
import { Printer, ShoppingBag, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useCancelRequest, useMyRequests } from "@/lib/queries/requests";
import { LONG_LOAN_DAYS, statusBadgeVariant, statusLabel } from "@/lib/requestStates";
import { daysSince, formatDateHe } from "@/lib/format";

// Rendered behind <RequireAuth>, so a user is always present.
const MyRequests = () => {
  const { user } = useAuth();
  const userId = user!.id;
  const { data, isLoading } = useMyRequests(userId);
  const cancel = useCancelRequest(userId);
  const prints = data?.prints ?? [];
  const lends = data?.lends ?? [];

  const cancelRequest = async (table: "print_requests" | "lend_requests", id: string) => {
    try {
      await cancel.mutateAsync({ table, id });
      toast.success("הבקשה בוטלה");
    } catch {
      toast.error("ביטול נכשל");
    }
  };

  return (
    <main className="container mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-4xl font-black"><span className="text-gradient">הבקשות</span> שלי</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/requests">הדפסה חדשה</Link></Button>
          <Button asChild size="sm"><Link to="/catalog">השאלת ציוד</Link></Button>
        </div>
      </div>

      {isLoading ? <PageLoading /> : (
        <Tabs defaultValue="print">
          <TabsList className="mb-6">
            <TabsTrigger value="print" className="gap-1.5"><Printer className="h-4 w-4" />הדפסות ({prints.length})</TabsTrigger>
            <TabsTrigger value="lend" className="gap-1.5"><ShoppingBag className="h-4 w-4" />השאלות ({lends.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="print" className="space-y-3">
            {prints.length === 0 && <EmptyState>לא שלחת בקשות הדפסה</EmptyState>}
            {prints.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-card p-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="min-w-0 flex-1 truncate font-bold" title={r.stl_file_name}>{r.stl_file_name}</h3>
                  <Badge variant={statusBadgeVariant(r.status)} className="shrink-0">{statusLabel("print", r.status)}</Badge>
                </div>
                <p className="text-sm"><strong>מטרה:</strong> {r.purpose}</p>
                <p className="text-sm"><strong>צבע:</strong> {r.filament_color}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{formatDateHe(r.created_at)}</p>
                  {r.status === "pending" && <CancelButton onConfirm={() => cancelRequest("print_requests", r.id)} />}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="lend" className="space-y-3">
            {lends.length === 0 && <EmptyState>לא שלחת בקשות השאלה</EmptyState>}
            {lends.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-card p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-bold">בקשת השאלה</h3>
                  <Badge variant={statusBadgeVariant(r.status)}>{statusLabel("lend", r.status)}</Badge>
                </div>
                <ul className="text-sm">
                  {r.lend_request_items?.map((li, i) => (
                    <li key={i}>• {li.catalog_items?.name ?? "פריט"} × {li.quantity}</li>
                  ))}
                </ul>
                {r.notes && <p className="mt-2 text-sm"><strong>הערות:</strong> {r.notes}</p>}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">נשלח: {formatDateHe(r.created_at)}</p>
                    {r.delivered_at && <p className="text-xs text-muted-foreground">נמסר: {formatDateHe(r.delivered_at)}</p>}
                    {r.returned_at && <p className="text-xs text-muted-foreground">הוחזר: {formatDateHe(r.returned_at)}</p>}
                    {r.status === "delivered" && daysSince(r.delivered_at) > LONG_LOAN_DAYS && (
                      <Badge variant="destructive" className="mt-1 w-fit gap-1 text-[10px]">
                        <AlertTriangle className="h-3 w-3" />השאלה ארוכה
                      </Badge>
                    )}
                  </div>
                  {r.status === "pending" && <CancelButton onConfirm={() => cancelRequest("lend_requests", r.id)} />}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </main>
  );
};

const CancelButton = ({ onConfirm }: { onConfirm: () => void | Promise<void> }) => (
  <ConfirmButton
    title="ביטול בקשה"
    description="פעולה זו תבטל את הבקשה ואינה ניתנת לשחזור."
    confirmLabel="בטל בקשה"
    onConfirm={onConfirm}
    trigger={
      <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
        <X className="h-3.5 w-3.5" />ביטול
      </Button>
    }
  />
);

export default MyRequests;
