
// /app/app/admin/page.tsx
import React from "react";
import SiteShell from "../components/SiteShell";
import { prisma } from "app/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import AdminTabs from "./AdminTabs";
import DbCrudClient from "./db/DbCrudClient";
import { getSession } from "app/auth";
import { isAdminByPrefs } from "app/data/prismaRepo";

// ---- Helpers ----
async function getInstalls() {
  return prisma.tcgProfileInstall.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      packageId: true,
      installedVersion: true,
      enabled: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// Build absolute URL for calling Pages API (bulk seed)
async function absUrl(path: string) {
  const hs = await headers();
  const host = hs.get("x-forwarded-host") ?? hs.get("host") ?? "localhost:3000";
  const proto =
    hs.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}${path}`;
}

// ---- Server actions ----
export async function toggleInstallEnabled(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "true";
  if (!id) redirect("/admin?ok=0&msg=missing%20id");

  await prisma.tcgProfileInstall.update({
    where: { id },
    data: { enabled },
  });

  revalidatePath("/admin");
  redirect("/admin?ok=1");
}

export async function enableAndSeedSelected(formData: FormData) {
  "use server";
  const selectedIds = formData.getAll("install").map(String).filter(Boolean);
  const seed = formData.get("seed") === "on";

  if (selectedIds.length === 0)
    redirect("/admin?ok=0&msg=No%20installs%20selected");

  const url = await absUrl("/api/admin/enable-profiles");
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ installs: selectedIds, seed }),
  });

  if (!res.ok) {
    const msg = encodeURIComponent(
      `Enable & seed failed: ${res.status} ${await res.text()}`
    );
    redirect(`/admin?ok=0&msg=${msg}`);
  }

  revalidatePath("/admin");
  redirect("/admin?ok=1");
}

// ---- Page ----
export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const sp = (searchParams ? await searchParams : undefined) ?? {};
  const ok = Array.isArray(sp.ok) ? sp.ok[0] : sp.ok;
  const msg = Array.isArray(sp.msg) ? sp.msg[0] : sp.msg;

  const installs = await getInstalls();
  const adminTab =
    (Array.isArray(sp.adminTab) ? sp.adminTab[0] : sp.adminTab) ?? "profiles";

  // Admin guard for System tools (and optionally for the whole page if you prefer)
  const session = await getSession();
  const userId = session?.user?.id;
  const isAdmin = userId ? await isAdminByPrefs(userId) : false;

  return (
    <SiteShell current="admin" title="Admin">
      <div className="flex items-center justify-between">
        <AdminTabs />
        {/* (Optional) add admin quick actions here */}
      </div>

      <section className="rounded-card border shadow-card bg-white p-4">
        {ok && (
          <div
            className={`rounded border px-3 py-2 text-sm ${
              ok === "1"
                ? "border-green-300 bg-green-50 text-green-800"
                : "border-red-300 bg-red-50 text-red-800"
            }`}
          >
            {ok === "1" ? "Success" : "Action failed"}
            {msg ? ` — ${decodeURIComponent(String(msg))}` : ""}
          </div>
        )}

        {adminTab === "profiles" && (
          <div>
            {/* Bulk actions */}
            <section className="rounded-card border shadow-card bg-white p-4 space-y-3">
              <h2 className="text-lg font-semibold">Bulk actions</h2>
              {/* Instruction row */}
              <p className="text-sm text-gray-600">
                Select installs in the table below, then click{" "}
                <strong>Enable &amp; Seed Selected</strong>.
              </p>

              {/* Visible control form (checkboxes live in the table, linked via form attribute) */}
              <form
                action={enableAndSeedSelected}
                id="bulk-enable-seed-form"
                className="flex items-center gap-4"
              >
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    id="seed"
                    name="seed"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4"
                  />
                  <span>
                    Also generate sample product sets &amp; release events (seed)
                  </span>
                </label>

                <button
                  type="submit"
                  className="text-sm px-3 py-1.5 rounded bg-brandAccent-600 text-white hover:bg-brandAccent-700"
                >
                  Enable &amp; Seed Selected
                </button>
              </form>
            </section>

            {/* Installs table */}
            <section className="rounded-card border shadow-card bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">TcgProfileInstalls</h2>
                <div className="text-sm text-storm-600">
                  {installs.length} total
                </div>
              </div>

              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left border-b">
                      <th className="py-2 px-3">Select</th>
                      <th className="py-2 px-3">Package</th>
                      <th className="py-2 px-3">Installed</th>
                      <th className="py-2 px-3">Enabled</th>
                      <th className="py-2 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installs.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="py-2 px-3 align-middle">
                          <input
                            type="checkbox"
                            name="install"
                            value={row.id}
                            form="bulk-enable-seed-form"
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="py-2 px-3 align-middle">
                          <div className="font-medium">{row.packageId}</div>
                          <div className="text-xs text-gray-500">
                            id {row.id.slice(0, 8)}…
                          </div>
                        </td>
                        <td className="py-2 px-3 align-middle">
                          <span className="text-xs text-gray-600">
                            {row.installedVersion}
                          </span>
                        </td>
                        <td className="py-2 px-3 align-middle">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                              row.enabled
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {row.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </td>
                        <td className="py-2 px-3 align-middle">
                          <form
                            action={toggleInstallEnabled}
                            className="inline-flex items-center gap-2"
                          >
                            <input type="hidden" name="id" value={row.id} />
                            <input
                              type="hidden"
                              name="enabled"
                              value={row.enabled ? "false" : "true"}
                            />
                            <button
                              type="submit"
                              className="px-2 py-1 rounded border text-xs hover:bg-gray-50"
                              title={
                                row.enabled
                                  ? "Disable install"
                                  : "Enable install"
                              }
                            >
                              {row.enabled ? "Disable" : "Enable"}
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                    {installs.length === 0 && (
                      <tr>
                        <td
                          className="py-6 px-3 text-center text-gray-500"
                          colSpan={5}
                        >
                          No installs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {adminTab === "users" && (
          <section className="rounded-card border shadow-card bg-white p-4">
            <h2 className="text-lg font-semibold">Users</h2>
            <p className="text-sm text-gray-600">
              Coming soon: basic user management (list, roles,
              deactivate/reactivate).
            </p>
          </section>
        )}

        {adminTab === "system" && (
          <section className="rounded-card border shadow-card bg-white p-4 space-y-4">
            <h2 className="text-lg font-semibold">System</h2>
            <ul className="text-sm list-disc pl-5 text-gray-700">
              <li>
                Health:{" "}
                <a href="/api/health/check" className="text-blue-600 hover:underline">
                  /api/health/check
                </a>
              </li>
              <li>
                DB: SQLite at{" "}
                <code className="text-gray-500">/app/data/app.db</code>{" "}
                (volume‑mapped)
              </li>
              <li>Runtime: Node 20 (Docker), Prisma v7 (better‑sqlite3)</li>
            </ul>

            {/* Admin-only DB Tools */}
            {!isAdmin ? (
              <p className="text-sm text-red-600">Not authorized to access DB Tools.</p>
            ) : (
              <div className="rounded border p-4">
                <h3 className="font-semibold mb-2">DB Tools (whitelisted models)</h3>
                <DbCrudClient />
              </div>
            )}
          </section>
        )}
      </section>
    </SiteShell>
  );
}

