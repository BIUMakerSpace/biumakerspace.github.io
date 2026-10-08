import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import SiteNav from "@/components/SiteNav";
import { PageLoading } from "@/components/layout/PageStates";

/** Shared chrome for every page: sticky nav + routed content. */
const AppLayout = () => (
  <div className="min-h-screen bg-background">
    <SiteNav />
    <Suspense fallback={<PageLoading />}>
      <Outlet />
    </Suspense>
  </div>
);

export default AppLayout;
