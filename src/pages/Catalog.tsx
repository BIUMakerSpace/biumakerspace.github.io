import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRequesterFields } from "@/hooks/useRequesterFields";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import CatalogFilters from "@/components/catalog/CatalogFilters";
import CatalogGrid from "@/components/catalog/CatalogGrid";
import ItemDetailsDialog from "@/components/catalog/ItemDetailsDialog";
import RequestItemDialog from "@/components/catalog/RequestItemDialog";
import CartSheet from "@/components/catalog/CartSheet";
import type { CatalogItem } from "@/components/catalog/types";
import {
  CATEGORIES, CATEGORY_TO_GENERAL, GENERAL_CATEGORIES, normalizeCategory, normalizeGeneralCategory,
  type CatalogCategory, type GeneralCategory,
} from "@/lib/categories";
import { cartLines, useCart } from "@/lib/cart";
import { useCatalogItems } from "@/lib/queries/catalog";

function itemGeneral(it: CatalogItem): GeneralCategory {
  if (it.general_category) return normalizeGeneralCategory(it.general_category);
  return CATEGORY_TO_GENERAL[normalizeCategory(it.category)];
}

const Catalog = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useCatalogItems();
  const { cart, add, decrement, remove, clear } = useCart();
  const { fields: requester, setField: setRequesterField } = useRequesterFields(user);

  const [search, setSearch] = useState("");
  const [generalCategory, setGeneralCategory] = useState<GeneralCategory | "all">("all");
  const [category, setCategory] = useState<CatalogCategory | "all">("all");
  const [details, setDetails] = useState<CatalogItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  // Changes on every add so the cart badge replays its "bump" animation.
  const [bumpKey, setBumpKey] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (generalCategory !== "all" && itemGeneral(it) !== generalCategory) return false;
      if (category !== "all" && normalizeCategory(it.category) !== category) return false;
      if (!q) return true;
      return it.name.toLowerCase().includes(q) || (it.description ?? "").toLowerCase().includes(q);
    });
  }, [items, search, category, generalCategory]);

  const generalCounts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const g of GENERAL_CATEGORIES) c[g] = 0;
    for (const it of items) c[itemGeneral(it)]++;
    return c;
  }, [items]);

  const detailedCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const cat of CATEGORIES) c[cat] = 0;
    for (const it of items) {
      if (generalCategory !== "all" && itemGeneral(it) !== generalCategory) continue;
      c[normalizeCategory(it.category)]++;
    }
    return c;
  }, [items, generalCategory]);

  const lines = useMemo(() => cartLines(cart, items), [cart, items]);
  const cartCount = lines.reduce((s, l) => s + l.qty, 0);

  const addToCart = (it: CatalogItem, { announce = true } = {}) => {
    if (!add(it.id, it.quantity_available)) {
      if (announce) toast.error("הגעת לכמות המקסימלית הזמינה");
      return;
    }
    setBumpKey((k) => k + 1);
    if (announce) toast.success(`${it.name} נוסף לעגלה`, { duration: 2000 });
  };

  const openItemRequest = () => {
    if (!user) { navigate("/auth?redirect=/catalog"); return; }
    setReqOpen(true);
  };

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <header className="mb-6 flex flex-col items-start justify-between gap-4 md:mb-8 md:flex-row md:items-end">
        <div className="text-center md:text-right">
          <h1 className="mb-2 text-3xl font-black text-foreground md:text-5xl">
            <span className="text-gradient">קטלוג</span> ציוד
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">חפשו ציוד, הוסיפו לעגלה ושלחו בקשת השאלה</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={openItemRequest} className="gap-1.5">
            <PackagePlus className="h-4 w-4" />בקש פריט חדש
          </Button>
          {/* Desktop cart pill */}
          <Button size="sm" onClick={() => setCartOpen(true)} className="hidden gap-1.5 md:inline-flex">
            <ShoppingCart className="h-4 w-4" />
            עגלה {cartCount > 0 && <span className="rounded-full bg-primary-foreground/20 px-2 text-xs">{cartCount}</span>}
          </Button>
        </div>
      </header>

      <CatalogFilters
        search={search}
        onSearchChange={setSearch}
        generalCategory={generalCategory}
        onGeneralCategoryChange={setGeneralCategory}
        category={category}
        onCategoryChange={setCategory}
        generalCounts={generalCounts}
        detailedCounts={detailedCounts}
      />

      {isLoading ? (
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
        <CatalogGrid items={filtered} cart={cart} onAdd={(it) => addToCart(it)} onShowDetails={setDetails} />
      )}

      <ItemDetailsDialog
        item={details}
        inCart={details ? cart[details.id] ?? 0 : 0}
        onAdd={(it) => addToCart(it)}
        onClose={() => setDetails(null)}
      />

      {user && (
        <RequestItemDialog
          open={reqOpen}
          onOpenChange={setReqOpen}
          userId={user.id}
          requester={requester}
          onRequesterChange={setRequesterField}
        />
      )}

      {/* Floating cart FAB */}
      {!cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          aria-label="פתח עגלה"
          className="group fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-lg shadow-primary/40 transition-all hover:scale-105 hover:shadow-xl md:bottom-6 md:left-6"
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="text-sm font-semibold">עגלה</span>
          {cartCount > 0 && (
            <span
              key={bumpKey}
              className="inline-flex h-6 min-w-[1.5rem] animate-in zoom-in-50 items-center justify-center rounded-full bg-primary-foreground px-1.5 text-xs font-bold text-primary"
            >
              {cartCount}
            </span>
          )}
        </button>
      )}

      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        lines={lines}
        onIncrement={(it) => addToCart(it, { announce: false })}
        onDecrement={decrement}
        onRemove={remove}
        onSubmitted={() => { clear(); setCartOpen(false); }}
        userId={user?.id ?? null}
        requester={requester}
        onRequesterChange={setRequesterField}
      />
    </main>
  );
};

export default Catalog;
