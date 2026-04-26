
// /app/app/admin/UsersTab.tsx
<<<<<<< HEAD
=======

>>>>>>> a01b7a957253c383303783724856fd7fba47ad34
import { adminListUsers, adminSetUserActive, adminSetUserIsAdmin } from "../../data/admin/adminRepo";
import { redirect } from "next/navigation";
import { fmtDate } from "../lib/utils";

export default async function UsersTab() {
  const users = await adminListUsers();

  // Inline server actions so forms can post directly
  
async function doToggleAdmin(formData: FormData) {
  "use server";
  const userId = String(formData.get("userId") ?? "");
  const next = formData.get("next") === "true";
  if (!userId) redirect("/admin?adminTab=users&ok=0&msg=missing%20userId");
  try {
    await adminSetUserIsAdmin(userId, next);
    redirect("/admin?adminTab=users&ok=1");
  } catch (e: any) {
    const msg = encodeURIComponent(String(e?.message ?? e));
    redirect(`/admin?adminTab=users&ok=0&msg=${msg}`);
  }
}


  
async function doToggleActive(formData: FormData) {
  "use server";
  const userId = String(formData.get("userId") ?? "");
  const next = formData.get("next") === "true";
  if (!userId) redirect("/admin?adminTab=users&ok=0&msg=missing%20userId");
  try {
    await adminSetUserActive(userId, next);
    redirect("/admin?adminTab=users&ok=1");
  } catch (e: any) {
    const msg = encodeURIComponent(String(e?.message ?? e));
    redirect(`/admin?adminTab=users&ok=0&msg=${msg}`);
  }
}


  return (
    <section className="space-y-3">
      <div className="text-sm text-neutral-500">Users ({users.length})</div>

      <div className="rounded border border-neutral-200 dark:border-neutral-800 divide-y">
        {users.map((u) => (
          <div key={u.id} className="p-3 flex items-center justify-between gap-3">
            {/* Left: identity */}
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs">
                {u.email?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div>
                <div className="text-sm font-medium">{u.email}</div>
                <div className="text-xs text-neutral-500">
                  Created {fmtDate(u.createdAt)} · Last {fmtDate((u as any).lastSignIn ?? u.lastSignIn)}
                </div>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2">
              {/* Toggle Admin */}
              <form action={doToggleAdmin}>
                <input type="hidden" name="userId" value={u.id} />
                <input type="hidden" name="next" value={(!u.isAdmin).toString()} />
                <button
                  type="submit"
                  className={`px-2 py-1 rounded text-xs border ${
                    u.isAdmin ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "border-neutral-300"
                  }`}
                  title="Toggle Admin"
                >
                  {u.isAdmin ? "Admin ✓" : "Make Admin"}
                </button>
              </form>

              {/* Toggle Active (if you added User.active) */}
              {"active" in u && (
                <form action={doToggleActive}>
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="next" value={(!(u as any).active).toString()} />
                  <button
                    type="submit"
                    className={`px-2 py-1 rounded text-xs border ${
                      (u as any).active
                        ? "bg-blue-50 border-blue-300 text-blue-700"
                        : "bg-neutral-50 border-neutral-300 text-neutral-600"
                    }`}
                    title="Deactivate/Reactivate"
                  >
                    {(u as any).active ? "Active" : "Inactive"}
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div className="p-6 text-center text-neutral-500">No users yet.</div>
        )}
      </div>
    </section>
  );
}
