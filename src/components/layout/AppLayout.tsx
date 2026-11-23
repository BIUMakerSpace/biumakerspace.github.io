import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import SiteNav from "@/components/SiteNav";
import { PageLoading } from "@/components/layout/PageStates";
import { publicAsset } from "@/config";

/** Shared chrome for every page: sticky nav + routed content + footer. */
const AppLayout = () => (
  <div className="flex min-h-screen flex-col bg-background">
    <SiteNav />
    <div className="flex-1">
      <Suspense fallback={<PageLoading />}>
        <Outlet />
      </Suspense>
    </div>
    {/* Google sign-in requires the privacy policy to be linked from the home page. */}
    <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
      <a href={publicAsset("privacy.html")} className="hover:text-foreground hover:underline">
        מדיניות פרטיות · Privacy policy
      </a>
    </footer>
  </div>
);

export default AppLayout;
