import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays, Check, Clock, Users, Sparkles, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/layout/PageStates";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage } from "@/lib/errors";
import { useToggleRegistration, useWorkshops } from "@/lib/queries/workshops";
import { meetingDate, meetingState, meetingTime, meetingWeekday, type Meeting } from "@/lib/workshops";

export default function Workshops() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mineOnly, setMineOnly] = useState(false);
  const { data: workshops = [], isLoading, isError, refetch } = useWorkshops(user?.id, !authLoading);
  const toggle = useToggleRegistration();
  const busyId = toggle.isPending ? toggle.variables?.meetingId : null;

  const register = (m: Meeting) => {
    if (!user) {
      navigate("/auth?redirect=/workshops");
      return;
    }
    toggle.mutate(
      { meetingId: m.id, register: !m.is_registered },
      {
        onSuccess: () => toast.success(m.is_registered ? "ההרשמה למפגש בוטלה" : "נרשמת למפגש בהצלחה"),
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  };

  // Admins also receive unpublished drafts; this page shows only what students see.
  const visible = workshops.filter((w) => w.is_published && (!mineOnly || w.meetings.some((m) => m.is_registered)));

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <header className="mb-8 border-b border-border pb-6">
        <p className="mb-2 text-sm font-semibold text-primary">BIU-CS Maker Space</p>
        <h1 className="mb-3 text-4xl font-black md:text-5xl">סדנאות</h1>
        <p className="max-w-2xl leading-relaxed text-muted-foreground">
          בונים יחד, מפגש אחר מפגש. רובוטיקה, חיישנים ופרויקטים שעובדים בעולם האמיתי.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />4 מפגשים לכל סדנה</span>
          <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-accent" />ימי שני · 18:00</span>
          <span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-primary" />עד 12 סטודנטים בכל מפגש</span>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">ההרשמה נפרדת לכל מפגש. ניתן לבטל הרשמה ולפנות את המקום לסטודנט אחר.</p>
      </header>

      {user && (
        <div className="mb-6 flex gap-2">
          <Button variant={mineOnly ? "outline" : "default"} onClick={() => setMineOnly(false)}>כל הסדנאות</Button>
          <Button variant={mineOnly ? "default" : "outline"} onClick={() => setMineOnly(true)}>המפגשים שלי</Button>
        </div>
      )}

      {isLoading || authLoading ? (
        <PageLoading />
      ) : isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3">
          <p>לא ניתן לטעון את הסדנאות כרגע</p>
          <Button variant="outline" onClick={() => void refetch()}><RefreshCw className="me-2 h-4 w-4" />נסו שוב</Button>
        </div>
      ) : (
        <div className="space-y-10">
          {visible.map((w, index) => (
            <motion.article
              key={w.id}
              id={w.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.08 }}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <div className="grid md:grid-cols-[260px_1fr]">
                {w.image_url ? (
                  <img src={w.image_url} alt={w.title} width={1200} height={800} loading="lazy"
                    className="aspect-[3/2] w-full object-cover md:h-full md:min-h-60" />
                ) : (
                  <div className="flex min-h-36 items-center justify-center bg-muted"><Sparkles className="h-12 w-12 text-accent" /></div>
                )}
                <div className="p-5 md:p-6">
                  <p className="mb-2 text-xs font-bold text-accent">
                    {w.meetings.length ? `סדנה ${index + 1} · ${w.meetings.length} מפגשים` : "בקרוב"}
                  </p>
                  <h2 className="mb-3 text-2xl font-black md:text-3xl">{w.title}</h2>
                  <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{w.description}</p>
                  {w.notice && <p className="mt-3 text-sm text-accent">{w.notice}</p>}
                  {!w.meetings.length && <p className="mt-4 text-sm text-muted-foreground">ההרשמה תיפתח עם פרסום המועדים.</p>}
                </div>
              </div>

              {!!w.meetings.length && (
                <div className="border-t border-border">
                  {w.meetings.filter((m) => !mineOnly || m.is_registered).map((m) => {
                    const state = meetingState(m);
                    const remaining = Math.max(0, m.capacity - m.registered_count);
                    return (
                      <div key={m.id} className="flex flex-col gap-3 border-b border-border p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between md:px-6">
                        <div className="min-w-0">
                          <h3 className="font-bold">
                            {m.title} <span className="font-normal text-muted-foreground">· {meetingDate(m.starts_at)}</span>
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span>{meetingWeekday(m.starts_at)} · {meetingTime(m.starts_at)}</span>
                            <span>{m.registered_count}/{m.capacity} רשומים</span>
                            {state === "available" && <span className="text-primary">{remaining} מקומות פנויים</span>}
                            {m.is_registered && (
                              <span className="inline-flex items-center gap-1 font-medium text-primary"><Check className="h-4 w-4" />נרשמת למפגש</span>
                            )}
                          </div>
                        </div>
                        <Button
                          className="w-full shrink-0 sm:w-40"
                          variant={m.is_registered ? "outline" : "default"}
                          // A registered student may still cancel; otherwise only open meetings are clickable.
                          disabled={toggle.isPending || (m.is_registered ? state === "past" : state !== "available")}
                          onClick={() => register(m)}
                        >
                          {busyId === m.id ? "מעדכן..."
                            : m.is_registered ? (state === "past" ? "המפגש הסתיים" : <><X className="me-2 h-4 w-4" />ביטול הרשמה</>)
                            : state === "full" ? "המפגש מלא"
                            : state === "cancelled" ? "המפגש בוטל"
                            : state === "past" ? "המפגש הסתיים"
                            : user ? "הרשמה למפגש" : "התחברות והרשמה"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.article>
          ))}
          {!visible.length && (
            <p className="py-8 text-center text-muted-foreground">
              {mineOnly ? "עדיין לא נרשמת למפגשים." : "סדנאות חדשות יפורסמו בקרוב."}
            </p>
          )}
        </div>
      )}

      <Link to="/" className="mt-8 inline-block text-sm text-primary hover:underline">חזרה לעמוד הבית</Link>
    </main>
  );
}
