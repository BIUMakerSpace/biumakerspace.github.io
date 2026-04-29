import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SiteNav from "@/components/SiteNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, ShoppingBag } from "lucide-react";

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
  completed: "הושלם", rejected: "נדחה",
  approved: "אושר", delivered: "נמסר", returned: "הוחזר",
};

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "rejected") return "destructive";
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

  useEffect(() => {
    if (!user) return;
    supabase.from("print_requests").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setPrints(data ?? []));
    supabase.from("lend_requests")
      .select("*, lend_request_items(quantity, catalog_items(name))")
      .order("created_at", { ascending: false })
      .then(({ data }) => setLends((data as LendReq[]) ?? []));
  }, [user]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SiteNav />
      <main className="container mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 flex items-end justify-between">
          <h1 className="text-4xl font-black"><span className="text-gradient">הבקשות</span> שלי</h1>
          <Link to="/requests"><Button variant="outline" size="sm">בקשה חדשה</Button></Link>
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
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-bold">{r.stl_file_name}</h3>
                  <Badge variant={statusVariant(r.status)}>{STATUS_HE[r.status] ?? r.status}</Badge>
                </div>
                <p className="text-sm"><strong>מטרה:</strong> {r.purpose}</p>
                <p className="text-sm"><strong>צבע:</strong> {r.filament_color}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("he-IL")}</p>
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
                <p className="mt-1 text-xs text-muted-foreground">נשלח: {new Date(r.created_at).toLocaleDateString("he-IL")}</p>
                {r.delivered_at && <p className="text-xs text-muted-foreground">נמסר: {new Date(r.delivered_at).toLocaleDateString("he-IL")}</p>}
                {r.returned_at && <p className="text-xs text-muted-foreground">הוחזר: {new Date(r.returned_at).toLocaleDateString("he-IL")}</p>}
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MyRequests;
