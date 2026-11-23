import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Info, Plus } from "lucide-react";
import { CATEGORY_LABELS, normalizeCategory } from "@/lib/categories";
import type { Cart } from "@/lib/cart";
import type { CatalogItem } from "./types";

interface Props {
  items: CatalogItem[];
  cart: Cart;
  onAdd: (item: CatalogItem) => void;
  onShowDetails: (item: CatalogItem) => void;
}

const CatalogGrid = ({ items, cart, onAdd, onShowDetails }: Props) => (
  <div className="grid gap-4 pb-24 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
    {items.map((item) => {
      const inCart = cart[item.id] ?? 0;
      const atMax = inCart >= item.quantity_available;
      return (
        <article
          key={item.id}
          className="flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
        >
          <button
            type="button"
            onClick={() => onShowDetails(item)}
            className="group relative block aspect-square w-full overflow-hidden bg-muted"
            aria-label={`פרטים על ${item.name}`}
          >
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.name}
                loading="lazy"
                className="h-full w-full object-contain p-2 transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ShoppingBag className="h-10 w-10" />
              </div>
            )}
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
              <Info className="h-3 w-3" /> פרטים
            </span>
          </button>
          <div className="flex flex-1 flex-col p-3">
            <Badge variant="secondary" className="mb-1.5 w-fit text-[10px]">
              {CATEGORY_LABELS[normalizeCategory(item.category)]}
            </Badge>
            <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{item.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              זמין: <span className={item.quantity_available > 0 ? "font-medium text-foreground" : "font-medium text-destructive"}>{item.quantity_available}</span> / {item.quantity_total}
            </p>
            <Button
              size="sm"
              variant={inCart ? "secondary" : "default"}
              className="mt-3 w-full gap-1.5"
              onClick={() => onAdd(item)}
              disabled={atMax || item.quantity_available === 0}
            >
              <Plus className="h-3.5 w-3.5" />
              {item.quantity_available === 0
                ? "אזל מהמלאי"
                : inCart ? `בעגלה (${inCart})` : "הוסף לעגלה"}
            </Button>
          </div>
        </article>
      );
    })}
  </div>
);

export default CatalogGrid;
