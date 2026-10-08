import { Button } from "@/components/ui/button";
import { statusLabel, statusOptions, type RequestKind } from "@/lib/requestStates";

/** "All / pending / approved / ..." filter buttons with counts. */
export function StatusFilter<T extends { status: string }>({ kind, rows, value, onChange }: {
  kind: RequestKind;
  rows: T[];
  value: string;
  onChange: (status: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">סינון לפי סטטוס:</span>
      <Button size="sm" variant={value === "all" ? "default" : "outline"} onClick={() => onChange("all")}>
        הכל ({rows.length})
      </Button>
      {statusOptions(kind).map((s) => (
        <Button key={s} size="sm" variant={value === s ? "default" : "outline"} onClick={() => onChange(s)}>
          {statusLabel(kind, s)} ({rows.filter((r) => r.status === s).length})
        </Button>
      ))}
    </div>
  );
}

/** One button per allowed next status of a request. */
export function TransitionButtons({ kind, current, next, onSelect }: {
  kind: RequestKind;
  current: string;
  next: string[];
  onSelect: (status: string) => void;
}) {
  return (
    <>
      {next.map((n) => (
        <Button
          key={n}
          size="sm"
          variant={n === "rejected" ? "outline" : "default"}
          className={n === "rejected" ? "text-destructive" : ""}
          onClick={() => onSelect(n)}
        >
          {n === "rejected" ? "דחה" : n === "approved" && current === "rejected" ? "החזר לאישור" : `העבר ל“${statusLabel(kind, n)}”`}
        </Button>
      ))}
    </>
  );
}
