import { lazy } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DirectionProvider } from "@radix-ui/react-direction";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/AuthProvider";
import { queryClient } from "@/lib/queryClient";
import AppLayout from "@/components/layout/AppLayout";
import { RequireAdmin, RequireAuth } from "@/components/layout/RouteGuards";
import Index from "./pages/Index";

// Everything except the landing page is split out of the initial bundle.
const Auth = lazy(() => import("./pages/Auth"));
const Catalog = lazy(() => import("./pages/Catalog"));
const Requests = lazy(() => import("./pages/Requests"));
const MyRequests = lazy(() => import("./pages/MyRequests"));
const Admin = lazy(() => import("./pages/admin/Admin"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Forum = lazy(() => import("./pages/Forum"));
const ForumThread = lazy(() => import("./pages/ForumThread"));
const Community = lazy(() => import("./pages/Community"));
const Lockers = lazy(() => import("./pages/Lockers"));
const NotFound = lazy(() => import("./pages/NotFound"));

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* Radix portals (selects, dialogs, sheets) render outside page markup, so set RTL globally. */}
    <DirectionProvider dir="rtl">
      <Toaster dir="rtl" />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/requests" element={<RequireAuth><Requests /></RequireAuth>} />
              <Route path="/my-requests" element={<RequireAuth><MyRequests /></RequireAuth>} />
              <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/forum" element={<Forum />} />
              <Route path="/forum/:id" element={<ForumThread />} />
              <Route path="/community" element={<Community />} />
              <Route path="/lockers" element={<Lockers />} />
              <Route path="/lockers/:number" element={<Lockers />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </DirectionProvider>
  </QueryClientProvider>
);

export default App;
