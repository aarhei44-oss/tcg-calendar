
// /app/app/admin/page.tsx
import React from "react";
import SiteShell from "../components/SiteShell";
import { prisma } from "../../app/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import AdminTabs from "./AdminTabs";
import DbCrudClient from "./db/DbCrudClient";
import { getSession } from "../../app/auth";
import { isAdminByPrefs } from "../../data/admin/adminRepo";
import UsersTab from "./UsersTab";
import SystemTab from "./SystemTab";
import { ensureAdmin } from "./db/actions";


import { getInstalls, absUrl } from "./db/actions";

// ---- Server actions (admin-only) ----
export async function toggleInstallEnabled(formData: FormData) {
  "use server";
  await ensureAdmin();

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
  await ensureAdmin();

  const selectedIds = formData.getAll("install").map(String).filter(Boolean);
  const seed = formData.get("seed") === "on";

  if (selectedIds.length === 0) {
    redirect("/admin?ok=0&msg=No%20installs%20selected");
  }

  const url = await absUrl("/api/admin/enable-profiles");
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    // NOTE: matches your updated handler: { installs, options: { seed } }
    body: JSON.stringify({ installs: selectedIds, options: { seed } }),
  });

  if (!res.ok) {
    const msg = encodeURIComponent(
      `Enable & seed failed: ${res.status} ${await res.text()}`,
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
  // NOTE: In Next.js 15/16, searchParams is a Promise in server components
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // ✅ Await searchParams before using
  const sp = await searchParams;
  const ok = Array.isArray(sp.ok) ? sp.ok[0] : sp.ok;
  const msg = Array.isArray(sp.msg) ? sp.msg[0] : sp.msg;
  const adminTab =
    (Array.isArray(sp.adminTab) ? sp.adminTab[0] : sp.adminTab) ?? "profiles";

  // Admin guard for the entire Admin area
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }
  const isAdmin = await isAdminByPrefs(session.user.id);
  if (!isAdmin) {
    notFound(); // Hide existence from non-admins (MVP policy)
  }

  // Data only loaded for profiles tab
  const installs = adminTab === "profiles" ? await getInstalls() : [];

  return (
    <SiteShell current="admin" title="Admin">
      <div className="flex items-center justify-between">
        <AdminTabs />
        {/* (Optional) admin quick actions */}
      </div>

      {/* Feedback banner */}
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

        {/* PROFILES TAB */}
        {adminTab === "profiles" && (
          <div className="space-y-4">
            <section className="rounded-card border shadow-card bg-white p-4 space-y-3">
              <h2 className="text-lg font-semibold">Bulk actions</h2>
              <p className="text-sm text-gray-600">
                Select installs in the table below, then click{" "}
                <strong>Enable &amp; Seed Selected</strong>.
              </p>

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
                  <span>Also generate sample product sets &amp; release events (seed)</span>
                </label>

                <button
                  type="submit"
                  className="text-sm px-3 py-1.5 rounded bg-brandAccent-600 text-white hover:bg-brandAccent-700"
                >
                  Enable &amp; Seed Selected
                </button>
              </form>
            </section>

            <section className="rounded-card border shadow-card bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">TcgProfileInstalls</h2>
                <div className="text-sm text-storm-600">{installs.length} total</div>
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
                          <div className="text-xs text-gray-500">id {row.id.slice(0, 8)}…</div>
                        </td>
                        <td className="py-2 px-3 align-middle">
                          <span className="text-xs text-gray-600">{row.installedVersion}</span>
                        </td>
                        <td className="py-2 px-3 align-middle">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                              row.enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {row.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </td>
                        <td className="py-2 px-3 align-middle">
                          <form action={toggleInstallEnabled} className="inline-flex items-center gap-2">
                            <input type="hidden" name="id" value={row.id} />
                            <input type="hidden" name="enabled" value={row.enabled ? "false" : "true"} />
                            <button
                              type="submit"
                              className="px-2 py-1 rounded border text-xs hover:bg-gray-50"
                              title={row.enabled ? "Disable install" : "Enable install"}
                            >
                              {row.enabled ? "Disable" : "Enable"}
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                    {installs.length === 0 && (
                      <tr>
                        <td className="py-6 px-3 text-center text-gray-500" colSpan={5}>
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

        {/* USERS TAB */}
        {adminTab === "users" && <UsersTab />}

        {/* SYSTEM TAB */}
        {adminTab === "system" && <SystemTab />}
      </section>
    </SiteShell>
  );
}
