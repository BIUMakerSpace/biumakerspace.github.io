import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClipboardList, GraduationCap, Heart, Lock, Mail, Package, Palette, Printer, ShoppingBag, Users, Warehouse } from "lucide-react";
import FilamentColorsManager from "@/components/admin/FilamentColorsManager";
import ItemSourcesManager from "@/components/admin/ItemSourcesManager";
import EmailTemplatesManager from "@/components/admin/EmailTemplatesManager";
import WishlistManager from "@/components/admin/WishlistManager";
import LockersManager from "@/components/admin/LockersManager";
import WorkshopsManager from "@/components/admin/WorkshopsManager";
import { useAdminUsers, useItemRequests, useLendRequests, usePrintRequests } from "@/lib/queries/admin";
import CatalogTab from "./CatalogTab";
import PrintRequestsTab from "./PrintRequestsTab";
import LendRequestsTab from "./LendRequestsTab";
import OnLoanTab from "./OnLoanTab";
import ItemRequestsTab from "./ItemRequestsTab";
import UsersTab from "./UsersTab";

const countPending = (rows: { status: string }[] = []) => rows.filter((r) => r.status === "pending").length;

// Rendered behind <RequireAdmin>; the database enforces admin rights independently.
const Admin = () => {
  // Same queries the tabs use (cached), for the counters in the tab bar.
  const { data: prints } = usePrintRequests();
  const { data: lends } = useLendRequests();
  const { data: itemRequests } = useItemRequests();
  const { data: users } = useAdminUsers();

  return (
    <main className="container mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-12">
      <h1 className="mb-6 text-2xl font-black text-foreground sm:mb-8 sm:text-4xl">
        <span className="text-gradient">ניהול</span> מייקרספייס
      </h1>

      <Tabs defaultValue="catalog">
        <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="catalog" className="gap-1.5"><Package className="h-4 w-4" />קטלוג</TabsTrigger>
          <TabsTrigger value="sources" className="gap-1.5"><Warehouse className="h-4 w-4" />מקורות</TabsTrigger>
          <TabsTrigger value="print" className="gap-1.5"><Printer className="h-4 w-4" />הדפסות ({countPending(prints)})</TabsTrigger>
          <TabsTrigger value="lend" className="gap-1.5"><ShoppingBag className="h-4 w-4" />השאלות ({countPending(lends)})</TabsTrigger>
          <TabsTrigger value="onloan" className="gap-1.5"><ClipboardList className="h-4 w-4" />ציוד מושאל</TabsTrigger>
          <TabsTrigger value="itemreq" className="gap-1.5"><Package className="h-4 w-4" />בקשות פריטים ({itemRequests?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="colors" className="gap-1.5"><Palette className="h-4 w-4" />צבעי פילמנט</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5"><Users className="h-4 w-4" />משתמשים ({users?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="wishlist" className="gap-1.5"><Heart className="h-4 w-4" />רשימת קניות</TabsTrigger>
          <TabsTrigger value="emails" className="gap-1.5"><Mail className="h-4 w-4" />תבניות מייל</TabsTrigger>
          <TabsTrigger value="lockers" className="gap-1.5"><Lock className="h-4 w-4" />לוקרים</TabsTrigger>
          <TabsTrigger value="workshops" className="gap-1.5"><GraduationCap className="h-4 w-4" />סדנאות</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog"><CatalogTab /></TabsContent>
        <TabsContent value="sources"><ItemSourcesManager /></TabsContent>
        <TabsContent value="print"><PrintRequestsTab /></TabsContent>
        <TabsContent value="lend"><LendRequestsTab /></TabsContent>
        <TabsContent value="onloan"><OnLoanTab /></TabsContent>
        <TabsContent value="itemreq"><ItemRequestsTab /></TabsContent>
        <TabsContent value="colors"><FilamentColorsManager /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="wishlist"><WishlistManager /></TabsContent>
        <TabsContent value="emails"><EmailTemplatesManager /></TabsContent>
        <TabsContent value="lockers"><LockersManager /></TabsContent>
        <TabsContent value="workshops"><WorkshopsManager /></TabsContent>
      </Tabs>
    </main>
  );
};

export default Admin;
