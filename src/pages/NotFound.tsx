import { Link } from "react-router-dom";
import SiteNav from "@/components/SiteNav";
import { Button } from "@/components/ui/button";

const NotFound = () => (
  <div className="min-h-screen bg-background" dir="rtl">
    <SiteNav />
    <div className="container mx-auto flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-5xl font-black text-foreground">404</h1>
      <p className="text-lg text-muted-foreground">הדף שחיפשתם לא נמצא</p>
      <Button asChild>
        <Link to="/">חזרה לדף הבית</Link>
      </Button>
    </div>
  </div>
);

export default NotFound;
