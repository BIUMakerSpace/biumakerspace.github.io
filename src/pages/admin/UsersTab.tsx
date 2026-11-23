import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/layout/PageStates";
import CreateLendForUser from "@/components/admin/CreateLendForUser";
import { Plus, Search } from "lucide-react";
import { useAdminUsers, type AdminUser } from "@/lib/queries/admin";
import { formatDateHe } from "@/lib/format";

const UsersTab = () => {
  const { data: users = [] } = useAdminUsers();
  const [search, setSearch] = useState("");
  const [createLendFor, setCreateLendFor] = useState<AdminUser | null>(null);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? users.filter((u) =>
        (u.full_name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.phone ?? "").toLowerCase().includes(q))
    : users;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm sm:flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם, אימייל או טלפון..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">{filtered.length} מתוך {users.length}</p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>אין משתמשים</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-muted/50 text-right">
              <tr>
                <th className="p-3 font-semibold">שם</th>
                <th className="p-3 font-semibold">אימייל</th>
                <th className="p-3 font-semibold">טלפון</th>
                <th className="p-3 font-semibold">תפקיד</th>
                <th className="p-3 font-semibold">הצטרף</th>
                <th className="p-3 font-semibold">פעולה</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium">{u.full_name ?? "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{u.email ?? "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{u.phone ?? "—"}</td>
                  <td className="p-3">
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                      {u.role === "admin" ? "מנהל" : "משתמש"}
                    </Badge>
                  </td>
                  <td className="p-3 text-xs">{formatDateHe(u.created_at)}</td>
                  <td className="p-3">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCreateLendFor(u)}>
                      <Plus className="h-3.5 w-3.5" />צור השאלה
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createLendFor && <CreateLendForUser user={createLendFor} onClose={() => setCreateLendFor(null)} />}
    </div>
  );
};

export default UsersTab;
