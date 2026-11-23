import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Ban, ChevronDown, ChevronUp, Pencil, Plus, RotateCcw, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import ConfirmButton from "@/components/ConfirmButton";
import { EmptyState, PageLoading } from "@/components/layout/PageStates";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage } from "@/lib/errors";
import { IMAGE_ACCEPT, publicUrlToPath, removeFiles, uploadPublicImage, validateImage } from "@/lib/storage";
import {
  useDeleteMeeting, useDeleteWorkshop, useMeetingRegistrations, useRemoveRegistration,
  useSaveMeeting, useSaveWorkshop, useWorkshops,
} from "@/lib/queries/workshops";
import {
  fromIsraelInputValue, meetingDate, meetingState, meetingTime, meetingWeekday, toIsraelInputValue,
  type Meeting, type Workshop,
} from "@/lib/workshops";

const fail = (e: unknown) => toast.error(errorMessage(e));
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Workshop form (create / edit)
// ---------------------------------------------------------------------------

function WorkshopForm({ workshop, onDone }: { workshop: Workshop | null; onDone: () => void }) {
  const save = useSaveWorkshop();
  const [title, setTitle] = useState(workshop?.title ?? "");
  const [description, setDescription] = useState(workshop?.description ?? "");
  const [notice, setNotice] = useState(workshop?.notice ?? "");
  const [sortOrder, setSortOrder] = useState(String(workshop?.sort_order ?? 0));
  const [published, setPublished] = useState(workshop?.is_published ?? false);
  const [imageUrl, setImageUrl] = useState(workshop?.image_url ?? "");
  const [image, setImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (image) {
      const err = validateImage(image);
      if (err) return toast.error(err);
    }
    try {
      setUploading(true);
      let url = imageUrl.trim() || null;
      if (image) url = (await uploadPublicImage("catalog-images", "workshops", image)).publicUrl;
      await save.mutateAsync({
        id: workshop?.id,
        values: {
          title: title.trim(),
          description: description.trim(),
          notice: notice.trim() || null,
          sort_order: Number(sortOrder) || 0,
          is_published: published,
          image_url: url,
        },
      });
      // Replaced or removed an image we host: clean it up (external URLs are left alone).
      if (workshop?.image_url && workshop.image_url !== url) {
        await removeFiles("catalog-images", [publicUrlToPath("catalog-images", workshop.image_url)]);
      }
      toast.success(workshop ? "הסדנה עודכנה" : "הסדנה נוצרה");
      onDone();
    } catch (err) {
      fail(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={submit} className="h-fit space-y-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-lg font-bold">{workshop ? `עריכה: ${workshop.title}` : "סדנה חדשה"}</h2>
      <div><Label htmlFor="ws-title">שם הסדנה</Label><Input id="ws-title" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
      <div><Label htmlFor="ws-desc">תיאור</Label><Textarea id="ws-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <div>
        <Label htmlFor="ws-notice">הערה מודגשת (אופציונלי)</Label>
        <Input id="ws-notice" value={notice} onChange={(e) => setNotice(e.target.value)} placeholder="ב־7.12 לא יתקיים מפגש בשל חופשת חנוכה." />
      </div>
      <div>
        <Label htmlFor="ws-image">תמונה</Label>
        <input id="ws-image" type="file" accept={IMAGE_ACCEPT} onChange={(e) => setImage(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
        {!image && imageUrl && (
          <div className="mt-2 flex items-center gap-2">
            <img src={imageUrl} alt="" className="h-12 w-16 rounded object-cover" />
            <Button type="button" size="sm" variant="ghost" onClick={() => setImageUrl("")}>הסר תמונה</Button>
          </div>
        )}
      </div>
      <div className="flex items-end gap-4">
        <div className="w-24"><Label htmlFor="ws-order">סדר</Label><Input id="ws-order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <Switch checked={published} onCheckedChange={setPublished} />
          {published ? "מפורסמת לסטודנטים" : "טיוטה (רק מנהלים רואים)"}
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={uploading || save.isPending}>
          {uploading || save.isPending ? "שומר..." : workshop ? "שמור שינויים" : "צור סדנה"}
        </Button>
        {workshop && <Button type="button" variant="outline" onClick={onDone}>ביטול</Button>}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------

function MeetingForm({ workshop, meeting, onDone }: { workshop: Workshop; meeting?: Meeting; onDone: () => void }) {
  const save = useSaveMeeting();
  const last = workshop.meetings.at(-1);
  // New meetings default to one week after the previous one (workshops are weekly).
  const defaultStart = meeting?.starts_at
    ?? (last ? new Date(new Date(last.starts_at).getTime() + WEEK_MS).toISOString() : null);
  const [title, setTitle] = useState(meeting?.title ?? `מפגש ${workshop.meetings.length + 1}`);
  const [startsAt, setStartsAt] = useState(defaultStart ? toIsraelInputValue(defaultStart) : "");
  const [capacity, setCapacity] = useState(String(meeting?.capacity ?? last?.capacity ?? 12));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(
      {
        id: meeting?.id,
        workshopId: workshop.id,
        values: {
          title: title.trim(),
          starts_at: fromIsraelInputValue(startsAt),
          capacity: Number(capacity),
          is_cancelled: meeting?.is_cancelled ?? false,
        },
      },
      { onSuccess: () => { toast.success(meeting ? "המפגש עודכן" : "המפגש נוסף"); onDone(); }, onError: fail },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 bg-muted/40 p-3">
      <div className="min-w-32 flex-1"><Label className="text-xs">כותרת</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
      <div><Label className="text-xs">מועד (שעון ישראל)</Label><Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required /></div>
      <div className="w-20"><Label className="text-xs">מקומות</Label><Input type="number" min={1} max={500} value={capacity} onChange={(e) => setCapacity(e.target.value)} required /></div>
      <Button type="submit" size="sm" disabled={save.isPending}>{meeting ? "שמור" : "הוסף"}</Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone}>ביטול</Button>
    </form>
  );
}

function Registrants({ meetingId }: { meetingId: string }) {
  const { data = [], isLoading } = useMeetingRegistrations(meetingId, true);
  const remove = useRemoveRegistration();
  if (isLoading) return <p className="px-3 pb-3 text-xs text-muted-foreground">טוען...</p>;
  if (!data.length) return <p className="px-3 pb-3 text-xs text-muted-foreground">אין רשומים עדיין.</p>;
  return (
    <div className="px-3 pb-3">
      <ol className="divide-y divide-border rounded-md border border-border text-sm">
        {data.map((r, i) => (
          <li key={r.id} className="flex items-center gap-3 px-3 py-1.5">
            <span className="w-5 text-muted-foreground">{i + 1}.</span>
            <span className="min-w-0 flex-1 truncate font-medium">{r.profiles?.full_name || "—"}</span>
            <span dir="ltr" className="hidden truncate text-xs text-muted-foreground sm:block">{r.profiles?.email}</span>
            <span dir="ltr" className="text-xs text-muted-foreground">{r.profiles?.phone || ""}</span>
            <ConfirmButton
              title={`להסיר את ${r.profiles?.full_name || "המשתמש"} מהמפגש?`}
              confirmLabel="הסר"
              onConfirm={() => remove.mutate(r.id, { onError: fail })}
              trigger={<Button size="icon" variant="ghost" className="h-7 w-7" aria-label="הסר רישום"><Trash2 className="h-3.5 w-3.5" /></Button>}
            />
          </li>
        ))}
      </ol>
      <p className="mt-1 text-xs text-muted-foreground">
        <a className="text-primary hover:underline" href={`mailto:?bcc=${data.map((r) => r.profiles?.email).filter(Boolean).join(",")}`}>
          שליחת מייל לכל הרשומים
        </a>
      </p>
    </div>
  );
}

function MeetingRowAdmin({ workshop, meeting }: { workshop: Workshop; meeting: Meeting }) {
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const save = useSaveMeeting();
  const del = useDeleteMeeting();
  const state = meetingState(meeting);

  if (editing) return <MeetingForm workshop={workshop} meeting={meeting} onDone={() => setEditing(false)} />;

  const toggleCancelled = () =>
    save.mutate(
      {
        id: meeting.id,
        workshopId: workshop.id,
        values: { title: meeting.title, starts_at: meeting.starts_at, capacity: meeting.capacity, is_cancelled: !meeting.is_cancelled },
      },
      { onError: fail },
    );

  return (
    <div className="border-b border-border last:border-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
        <div className="min-w-0 flex-1">
          <span className="font-semibold">{meeting.title}</span>{" "}
          <span className="text-sm text-muted-foreground">
            · {meetingWeekday(meeting.starts_at)} {meetingDate(meeting.starts_at)} · {meetingTime(meeting.starts_at)}
          </span>
        </div>
        {state === "cancelled" && <Badge variant="destructive">בוטל</Badge>}
        {state === "past" && <Badge variant="secondary">הסתיים</Badge>}
        {state === "full" && <Badge variant="outline">מלא</Badge>}
        <Button size="sm" variant="ghost" className="gap-1" onClick={() => setOpen((o) => !o)}>
          <Users className="h-3.5 w-3.5" />{meeting.registered_count}/{meeting.capacity}
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="ערוך מפגש" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={meeting.is_cancelled ? "החזר מפגש" : "בטל מפגש"}
          title={meeting.is_cancelled ? "החזר מפגש" : "בטל מפגש"} onClick={toggleCancelled}>
          {meeting.is_cancelled ? <RotateCcw className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
        </Button>
        <ConfirmButton
          title={`למחוק את "${meeting.title}"?`}
          description={meeting.registered_count ? `${meeting.registered_count} רשומים יימחקו יחד עם המפגש. כדי להשאיר אותם, עדיף לבטל את המפגש.` : undefined}
          confirmLabel="מחק"
          onConfirm={() => del.mutate(meeting.id, { onError: fail })}
          trigger={<Button size="icon" variant="ghost" className="h-8 w-8" aria-label="מחק מפגש"><Trash2 className="h-3.5 w-3.5" /></Button>}
        />
      </div>
      {open && <Registrants meetingId={meeting.id} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab
// ---------------------------------------------------------------------------

export default function WorkshopsManager() {
  const { user } = useAuth();
  const { data: workshops = [], isLoading } = useWorkshops(user?.id);
  const del = useDeleteWorkshop();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const editing = workshops.find((w) => w.id === editingId) ?? null;

  if (isLoading) return <PageLoading />;

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      {/* key remounts the form when switching between new / different workshops */}
      <WorkshopForm key={editingId ?? "new"} workshop={editing} onDone={() => setEditingId(null)} />

      <div className="space-y-4">
        {!workshops.length && <EmptyState>אין סדנאות עדיין. צרו את הראשונה בטופס.</EmptyState>}
        {workshops.map((w) => (
          <section key={w.id} className="overflow-hidden rounded-lg border border-border bg-card">
            <header className="flex flex-wrap items-center gap-2 border-b border-border p-3">
              <h3 className="min-w-0 flex-1 text-lg font-bold">{w.title}</h3>
              <Badge variant={w.is_published ? "default" : "secondary"}>{w.is_published ? "מפורסמת" : "טיוטה"}</Badge>
              <Button size="sm" variant="ghost" className="gap-1" onClick={() => setEditingId(w.id)}><Pencil className="h-3.5 w-3.5" />עריכה</Button>
              <ConfirmButton
                title={`למחוק את הסדנה "${w.title}"?`}
                description="כל המפגשים וההרשמות של הסדנה יימחקו. כדי רק להסתיר אותה, הפכו אותה לטיוטה."
                confirmLabel="מחק סדנה"
                onConfirm={() => del.mutate(w.id, { onError: fail, onSuccess: () => editingId === w.id && setEditingId(null) })}
                trigger={<Button size="icon" variant="ghost" className="h-8 w-8" aria-label="מחק סדנה"><Trash2 className="h-3.5 w-3.5" /></Button>}
              />
            </header>
            {w.meetings.map((m) => <MeetingRowAdmin key={m.id} workshop={w} meeting={m} />)}
            {addingTo === w.id ? (
              <MeetingForm workshop={w} onDone={() => setAddingTo(null)} />
            ) : (
              <div className="p-2">
                <Button size="sm" variant="ghost" className="gap-1" onClick={() => setAddingTo(w.id)}><Plus className="h-3.5 w-3.5" />הוספת מפגש</Button>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
