import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { CATEGORY_LABELS, normalizeCategory } from "@/lib/categories";
import type { CatalogItem } from "./types";

interface Props {
  item: CatalogItem | null;
  inCart: number;
  onAdd: (item: CatalogItem) => void;
  onClose: () => void;
}

const ItemDetailsDialog = ({ item, inCart, onAdd, onClose }: Props) => (
  <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-w-lg">
      {item && (
        <>
          <DialogHeader>
            <DialogTitle className="text-2xl">{item.name}</DialogTitle>
            <DialogDescription>זמין כעת: {item.quantity_available} / {item.quantity_total}</DialogDescription>
          </DialogHeader>
          {item.image_url && (
            <img
              src={item.image_url}
              alt={item.name}
              className="mx-auto max-h-64 rounded-md bg-muted object-contain p-2"
            />
          )}
          <Badge variant="secondary" className="w-fit">
            {CATEGORY_LABELS[normalizeCategory(item.category)]}
          </Badge>
          {item.description ? (
            <p className="whitespace-pre-line text-sm text-foreground">{item.description}</p>
          ) : (
            <p className="text-sm italic text-muted-foreground">אין תיאור נוסף</p>
          )}
          <DialogFooter className="sm:justify-start">
            <Button
              onClick={() => { onAdd(item); onClose(); }}
              disabled={inCart >= item.quantity_available || item.quantity_available === 0}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />הוסף לעגלה
            </Button>
            <Button variant="outline" onClick={onClose}>סגור</Button>
          </DialogFooter>
        </>
      )}
    </DialogContent>
  </Dialog>
);

export default ItemDetailsDialog;
