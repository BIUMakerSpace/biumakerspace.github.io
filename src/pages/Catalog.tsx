import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SiteNav from "@/components/SiteNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Package, ShoppingBag, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_TO_GENERAL,
  GENERAL_CATEGORIES,
  GENERAL_CATEGORY_LABELS,
  normalizeCategory,
  normalizeGeneralCategory,
  type CatalogCategory,
  type GeneralCategory,
} from "@/lib/categories";

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  quantity_available: number;
  quantity_total: number;
  category: string;
  general_category: string;
}

const Catalog = () => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [generalCategory, setGeneralCategory] = useState<GeneralCategory | "all">("all");
  const [category, setCategory] = useState<CatalogCategory | "all">("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [details, setDetails] = useState<CatalogItem | null>(null);

  useEffect(() => {
    supabase.from("catalog_items").select("*").order("name").then(({ data }) => {
      setItems((data ?? []) as CatalogItem[]);
      setLoading(false);
    });
  }, []);

  const itemGeneral = (it: CatalogItem): GeneralCategory => {
    if (it.general_category) return normalizeGeneralCategory(it.general_category);
    return CATEGORY_TO_GENERAL[normalizeCategory(it.category)];
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (generalCategory !== "all" && itemGeneral(it) !== generalCategory) return false;
      if (category !== "all" && normalizeCategory(it.category) !== category) return false;
      if (!q) return true;
      return (
        it.name.toLowerCase().includes(q) ||
        (it.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, category, generalCategory]);

  const generalCounts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const g of GENERAL_CATEGORIES) c[g] = 0;
    for (const it of items) c[itemGeneral(it)]++;
    return c;
  }, [items]);

  // Detailed sub-categories visible in "advanced" view, scoped to selected general
  const visibleDetailed = useMemo(() => {
    if (generalCategory === "all") return CATEGORIES;
    return CATEGORIES.filter((c) => CATEGORY_TO_GENERAL[c] === generalCategory);
  }, [generalCategory]);

  const detailedCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const cat of CATEGORIES) c[cat] = 0;
    for (const it of items) {
      if (generalCategory !== "all" && itemGeneral(it) !== generalCategory) continue;
      c[normalizeCategory(it.category)]++;
    }
    return c;
  }, [items, generalCategory]);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SiteNav />
      <main className="container mx-auto max-w-6xl px-6 py-12">
        <header className="mb-8 text-center">
          <h1 className="mb-3 text-4xl font-black text-foreground md:text-5xl">
            <span className="text-gradient">קטלוג</span> ציוד
          </h1>
          <p className="text-muted-foreground">כל הציוד הזמין במייקרספייס — חפשו, סננו, ובקשו השאלה</p>
        </header>

        <div className="mb-6 space-y-4">
          <div className="relative mx-auto max-w-xl">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="חיפוש פריט לפי שם או תיאור..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 h-11"
            />
          </div>

          {/* Main 5 general categories */}
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              size="sm"
              variant={generalCategory === "all" ? "default" : "outline"}
              onClick={() => {
                setGeneralCategory("all");
                setCategory("all");
              }}
              className="rounded-full"
            >
              הכל ({generalCounts.all})
            </Button>
            {GENERAL_CATEGORIES.map((g) => (
              <Button
                key={g}
                size="sm"
                variant={generalCategory === g ? "default" : "outline"}
                onClick={() => {
                  setGeneralCategory(g);
                  setCategory("all");
                }}
                className="rounded-full"
              >
                {GENERAL_CATEGORY_LABELS[g]} ({generalCounts[g]})
              </Button>
            ))}
          </div>

          {/* Advanced toggle */}
          <div className="flex justify-center">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAdvanced((s) => !s)}
              className="text-xs text-muted-foreground"
            >
              {showAdvanced ? "הסתר סינון מתקדם" : "סינון מתקדם"}
            </Button>
          </div>

          {showAdvanced && (
            <div className="flex flex-wrap justify-center gap-2 border-t border-border pt-3">
              <Button
                size="sm"
                variant={category === "all" ? "default" : "outline"}
                onClick={() => setCategory("all")}
                className="rounded-full"
              >
                כל תתי-הקטגוריות
              </Button>
              {visibleDetailed.map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={category === cat ? "default" : "outline"}
                  onClick={() => setCategory(cat)}
                  className="rounded-full"
                  disabled={detailedCounts[cat] === 0}
                >
                  {CATEGORY_LABELS[cat]} ({detailedCounts[cat]})
                </Button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <p className="rounded-lg border border-border bg-card p-12 text-center text-sm text-muted-foreground">
            טוען...
          </p>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {items.length === 0 ? "הקטלוג ריק כרגע" : "לא נמצאו פריטים תואמים"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((item) => {
              const cat = normalizeCategory(item.category);
              return (
                <article
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => setDetails(item)}
                    className="group block aspect-square w-full overflow-hidden bg-muted"
                    aria-label={`פרטים על ${item.name}`}
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-full w-full object-contain p-2 transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ShoppingBag className="h-10 w-10" />
                      </div>
                    )}
                  </button>
                  <div className="flex flex-1 flex-col p-3">
                    <Badge variant="secondary" className="mb-1.5 w-fit text-[10px]">
                      {CATEGORY_LABELS[cat]}
                    </Badge>
                    <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{item.name}</h3>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      זמין: <span className={item.quantity_available > 0 ? "text-foreground font-medium" : "text-destructive font-medium"}>{item.quantity_available}</span> / {item.quantity_total}
                    </p>
                    <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                      <Link to="/requests">בקש להשאלה</Link>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <Dialog open={!!details} onOpenChange={(o) => !o && setDetails(null)}>
          <DialogContent dir="rtl" className="max-w-lg">
            {details && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{details.name}</DialogTitle>
                </DialogHeader>
                {details.image_url && (
                  <img
                    src={details.image_url}
                    alt={details.name}
                    className="mx-auto max-h-64 rounded-md bg-muted object-contain p-2"
                  />
                )}
                <Badge variant="secondary" className="w-fit">
                  {CATEGORY_LABELS[normalizeCategory(details.category)]}
                </Badge>
                {details.description && (
                  <p className="whitespace-pre-line text-sm text-foreground">{details.description}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  זמין: <span className="font-medium text-foreground">{details.quantity_available}</span> מתוך {details.quantity_total}
                </p>
                <Button asChild className="w-full">
                  <Link to="/requests" onClick={() => setDetails(null)}>בקש להשאלה</Link>
                </Button>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Catalog;
