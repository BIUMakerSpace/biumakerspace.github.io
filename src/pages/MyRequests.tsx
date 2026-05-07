import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SiteNav from "@/components/SiteNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, ShoppingBag, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PrintReq {
  id: string; purpose: string; filament_color: string; status: string;
  stl_file_name: string; created_at: string;
}
interface LendReq {
  id: string; status: string; notes: string | null; created_at: string;
  delivered_at: string | null; returned_at: string | null;
  lend_request_items: { quantity: number; catalog_items: { name: string } | null }[];
}

const STATUS_HE: Record<string, string> = {
  pending: "ממתין", printing: "מדפיס", ready: "מוכן לאיסוף",
  completed: "הושלם", rejected: "נדחה", cancelled: "בוטל",
  approved: "אושר", delivered: "נמסר", returned: "הוחזר",
};

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "rejected" || s === "cancelled") return "destructive";
  if (s === "completed" || s === "returned") return "secondary";
  if (s === "ready" || s === "delivered" || s === "approved") return "default";
  return "outline";
};

const MyRequests = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [prints, setPrints] = useState<PrintReq[]>([]);
  const [lends, setLends] = useState<LendReq[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  const loadData = () => {
    if (!user) return;
    supabase.from("print_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setPrints(data ?? []));
    supabase.from("lend_requests")
      .select("*, lend_request_items(quantity, catalog_items(name))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setLends((data as LendReq[]) ?? []));
  };

  useEffect(() => { loadData(); /* eslint-disable-next-line */ }, [user]);

  const cancelPrint = async (id: string) => {
    const { error } = await supabase.from("print_requests")
      .update({ status: "cancelled" }).eq("id", id);
    if (error) { toast.error("ביטול נכשל"); return; }
    toast.success("הבקשה בוטלה");
    loadData();
  };

  const cancelLend = async (id: string) => {
    const { error } = await supabase.from("lend_requests")
      .update({ status: "cancelled" }).eq("id", id);
    if (error) { toast.error("ביטול נכשל"); return; }
    toast.success("הבקשה בוטלה");
    loadData();
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SiteNav />
      <main className="container mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-4xl font-black"><span className="text-gradient">הבקשות</span> שלי</h1>
          <div className="flex gap-2">
            <Link to="/requests"><Button variant="outline" size="sm">הדפסה חדשה</Button></Link>
            <Link to="/catalog"><Button size="sm">השאלת ציוד</Button></Link>
          </div>
        </div>

        <Tabs defaultValue="print" dir="rtl">
          <TabsList className="mb-6">
            <TabsTrigger value="print" className="gap-1.5"><Printer className="h-4 w-4" />הדפסות ({prints.length})</TabsTrigger>
            <TabsTrigger value="lend" className="gap-1.5"><ShoppingBag className="h-4 w-4" />השאלות ({lends.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="print" className="space-y-3">
            {prints.length === 0 && <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">לא שלחת בקשות הדפסה</p>}
            {prints.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-card p-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="min-w-0 flex-1 truncate font-bold" title={r.stl_file_name}>{r.stl_file_name}</h3>
                  <Badge variant={statusVariant(r.status)} className="shrink-0">{STATUS_HE[r.status] ?? r.status}</Badge>
                </div>
                <p className="text-sm"><strong>מטרה:</strong> {r.purpose}</p>
                <p className="text-sm"><strong>צבע:</strong> {r.filament_color}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("he-IL")}</p>
                  {r.status === "pending" && <CancelButton onConfirm={() => cancelPrint(r.id)} />}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="lend" className="space-y-3">
            {lends.length === 0 && <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">לא שלחת בקשות השאלה</p>}
            {lends.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-card p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-bold">בקשת השאלה</h3>
                  <Badge variant={statusVariant(r.status)}>{STATUS_HE[r.status] ?? r.status}</Badge>
                </div>
                <ul className="text-sm">
                  {r.lend_request_items?.map((li, i) => (
                    <li key={i}>• {li.catalog_items?.name ?? "פריט"} × {li.quantity}</li>
                  ))}
                </ul>
                {r.notes && <p className="mt-2 text-sm"><strong>הערות:</strong> {r.notes}</p>}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">נשלח: {new Date(r.created_at).toLocaleDateString("he-IL")}</p>
                    {r.delivered_at && <p className="text-xs text-muted-foreground">נמסר: {new Date(r.delivered_at).toLocaleDateString("he-IL")}</p>}
                    {r.returned_at && <p className="text-xs text-muted-foreground">הוחזר: {new Date(r.returned_at).toLocaleDateString("he-IL")}</p>}
                  </div>
                  {r.status === "pending" && <CancelButton onConfirm={() => cancelLend(r.id)} />}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};


const CancelButton = ({ onConfirm }: { onConfirm: () => void | Promise<void> }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
        <X className="h-3.5 w-3.5" />ביטול
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent dir="rtl">
      <AlertDialogHeader>
        <AlertDialogTitle>ביטול בקשה</AlertDialogTitle>
        <AlertDialogDescription>פעולה זו תבטל את הבקשה ואינה ניתנת לשחזור.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>חזרה</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          בטל בקשה
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default MyRequests;
