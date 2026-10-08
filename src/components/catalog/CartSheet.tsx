import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ShoppingBag, ShoppingCart, Plus, Minus, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { LOAN_RETURN_DEADLINE } from "@/config";
import type { RequesterFields } from "@/hooks/useRequesterFields";
import { useCreateLendRequest } from "@/lib/queries/requests";
import { requesterSchema } from "@/lib/schemas";
import { errorMessage } from "@/lib/errors";
import type { CatalogItem } from "./types";

const lendSchema = requesterSchema.extend({
  notes: z.string().trim().max(1000),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: { item: CatalogItem; qty: number }[];
  onIncrement: (item: CatalogItem) => void;
  onDecrement: (id: string) => void;
  onRemove: (id: string) => void;
  onSubmitted: () => void;
  /** Null when signed out: the form then offers sign-in instead of submit. */
  userId: string | null;
  requester: RequesterFields;
  onRequesterChange: (key: keyof RequesterFields, value: string) => void;
}

const CartSheet = ({
  open, onOpenChange, lines, onIncrement, onDecrement, onRemove, onSubmitted,
  userId, requester, onRequesterChange,
}: Props) => {
  const createLend = useCreateLendRequest(userId ?? "");
  const [notes, setNotes] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (lines.length === 0) { toast.error("העגלה ריקה"); return; }
    if (!agreed) { toast.error("יש לאשר את תנאי ההשאלה"); return; }
    const parsed = lendSchema.safeParse({ ...requester, notes });
    if (!parsed.success) { toast.error("יש למלא את כל השדות בצורה תקינה"); return; }
    try {
      await createLend.mutateAsync({
        ...parsed.data,
        items: lines.map(({ item, qty }) => ({ item_id: item.id, quantity: qty })),
      });
      toast.success("הבקשה נשלחה!", { description: "ניצור קשר בקרוב" });
      setNotes(""); setAgreed(false);
      onSubmitted();
    } catch (err) {
      toast.error("שגיאה בשליחה", { description: errorMessage(err) });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md [&>button]:hidden"
      >
        <SheetHeader className="border-b border-border px-5 py-4 text-right">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="gap-1.5"
              aria-label="חזרה לקטלוג"
            >
              <ArrowRight className="h-4 w-4" />
              חזרה
            </Button>
            <SheetTitle className="flex items-center gap-2 text-xl">
              <ShoppingCart className="h-5 w-5 text-primary" />
              העגלה שלי {count > 0 && <span className="text-base text-muted-foreground">({count})</span>}
            </SheetTitle>
          </div>
          <SheetDescription>
            סקרו את הפריטים, מלאו פרטים ושלחו בקשת השאלה
          </SheetDescription>
        </SheetHeader>

        {/* Mobile: single scroll for items + form. Desktop (sm+): items scroll, form pinned. */}
        <div className="flex flex-1 flex-col overflow-y-auto sm:overflow-hidden">
          <div className="px-5 py-4 sm:flex-1 sm:overflow-y-auto">
            {lines.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <ShoppingCart className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">העגלה ריקה</p>
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  המשך לעיין בקטלוג
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {lines.map(({ item, qty }) => (
                  <li key={item.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="h-full w-full object-contain p-1" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ShoppingBag className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">זמין: {item.quantity_available}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-7 sm:w-7" onClick={() => onDecrement(item.id)} aria-label="הפחת"><Minus className="h-3.5 w-3.5" /></Button>
                      <span className="w-6 text-center text-sm font-medium">{qty}</span>
                      <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-7 sm:w-7" onClick={() => onIncrement(item)} disabled={qty >= item.quantity_available} aria-label="הוסף"><Plus className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive sm:h-7 sm:w-7" onClick={() => onRemove(item.id)} aria-label="הסר"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {lines.length > 0 && (
            <form onSubmit={submit} className="space-y-3 border-t border-border bg-card/40 px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="l-name" className="text-xs">שם מלא</Label>
                  <Input id="l-name" value={requester.requester_name} onChange={(e) => onRequesterChange("requester_name", e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="l-phone" className="text-xs">טלפון</Label>
                  <Input id="l-phone" type="tel" value={requester.requester_phone} onChange={(e) => onRequesterChange("requester_phone", e.target.value)} required />
                </div>
              </div>
              <div>
                <Label htmlFor="l-email" className="text-xs">אימייל</Label>
                <Input id="l-email" type="email" value={requester.requester_email} onChange={(e) => onRequesterChange("requester_email", e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="l-notes" className="text-xs">הערות (לא חובה)</Label>
                <Textarea id="l-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="l-agree"
                    checked={agreed}
                    onCheckedChange={(c) => setAgreed(c === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="l-agree" className="cursor-pointer text-xs leading-relaxed text-foreground">
                    <span className="mb-1.5 block text-sm font-bold">הצהרת השאלה</span>
                    <span className="block text-muted-foreground">
                      קראתי ואני מאשר/ת את תנאי ההשאלה — שמירה על הציוד, אחריות מלאה לנזק/אובדן, והחזרה עד{" "}
                      <span className="font-semibold text-foreground">{LOAN_RETURN_DEADLINE}</span>.
                    </span>
                  </Label>
                </div>
                <button
                  type="button"
                  onClick={() => setTermsOpen((o) => !o)}
                  className="mt-2 text-xs font-medium text-primary underline-offset-2 hover:underline sm:hidden"
                >
                  {termsOpen ? "הסתר תנאים מלאים" : "הצג תנאים מלאים"}
                </button>
                <ul
                  className={`mt-2 list-disc space-y-1 pr-4 text-xs text-muted-foreground marker:text-primary sm:block ${termsOpen ? "block" : "hidden"}`}
                >
                  <li>לשמור על הציוד בקפידה ולהשתמש בו אך ורק למטרה שלשמה הושאל.</li>
                  <li>לשאת באחריות מלאה לכל נזק, אובדן או גניבה של הציוד שבהשאלתי.</li>
                  <li>לא להוציא את הציוד מהמייקרספייס ללא אישור מפורש מאחד המדריכים.</li>
                  <li>
                    להחזיר את כל הציוד במצב תקין ושלם לכל המאוחר עד{" "}
                    <span className="font-semibold text-foreground">{LOAN_RETURN_DEADLINE}</span> (סוף שנת הלימודים).
                  </li>
                </ul>
              </div>

              <div className="sticky bottom-0 -mx-5 -mb-4 border-t border-border bg-card px-5 py-3 sm:static sm:m-0 sm:border-0 sm:bg-transparent sm:p-0">
                {!userId ? (
                  // The cart is kept in sessionStorage, so it survives the sign-in round trip.
                  <Button asChild type="button" className="w-full">
                    <Link to="/auth?redirect=/catalog">התחברו כדי להגיש בקשה</Link>
                  </Button>
                ) : (
                  <Button type="submit" disabled={createLend.isPending || !agreed} className="w-full">
                    {createLend.isPending ? "שולח..." : `שלח בקשת השאלה (${count})`}
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CartSheet;
