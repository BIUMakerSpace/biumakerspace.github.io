import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { z } from "zod";
import type { RequesterFields } from "@/hooks/useRequesterFields";
import { useCreateItemRequest } from "@/lib/queries/requests";
import { optionalHttpUrl, requesterSchema } from "@/lib/schemas";
import { errorMessage } from "@/lib/errors";

const itemReqSchema = requesterSchema.extend({
  item_name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(1000),
  reference_link: optionalHttpUrl,
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  requester: RequesterFields;
  onRequesterChange: (key: keyof RequesterFields, value: string) => void;
}

/** "Didn't find it in the catalog? Ask us to buy it." */
const RequestItemDialog = ({ open, onOpenChange, userId, requester, onRequesterChange }: Props) => {
  const createItemRequest = useCreateItemRequest(userId);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [link, setLink] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = itemReqSchema.safeParse({ ...requester, item_name: name, description: desc, reference_link: link });
    if (!parsed.success) {
      const linkIssue = parsed.error.issues.find((i) => i.path[0] === "reference_link");
      toast.error(linkIssue?.message ?? "יש למלא שם, אימייל וטלפון בעגלה ושם פריט");
      return;
    }
    try {
      await createItemRequest.mutateAsync(parsed.data);
      toast.success("הבקשה נשלחה!", { description: "נבחן הוספת הפריט לקטלוג" });
      setName(""); setDesc(""); setLink(""); onOpenChange(false);
    } catch (err) {
      toast.error("שגיאה בשליחה", { description: errorMessage(err) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>בקשה לפריט חדש</DialogTitle>
          <DialogDescription>לא מצאתם בקטלוג? ספרו לנו על הפריט ואולי נזמין אותו.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="ri-name">שם הפריט</Label>
            <Input id="ri-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={150} />
          </div>
          <div>
            <Label htmlFor="ri-desc">תיאור / לשם מה תשמשו אותו</Label>
            <Textarea id="ri-desc" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} maxLength={1000} />
          </div>
          <div>
            <Label htmlFor="ri-link">קישור (לא חובה)</Label>
            <Input id="ri-link" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." maxLength={500} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="ri-r-name" className="text-xs">שם מלא</Label>
              <Input id="ri-r-name" value={requester.requester_name} onChange={(e) => onRequesterChange("requester_name", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="ri-r-email" className="text-xs">אימייל</Label>
              <Input id="ri-r-email" type="email" value={requester.requester_email} onChange={(e) => onRequesterChange("requester_email", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="ri-r-phone" className="text-xs">טלפון</Label>
              <Input id="ri-r-phone" type="tel" value={requester.requester_phone} onChange={(e) => onRequesterChange("requester_phone", e.target.value)} required />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button type="submit" disabled={createItemRequest.isPending}>{createItemRequest.isPending ? "שולח..." : "שלח בקשה"}</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RequestItemDialog;
