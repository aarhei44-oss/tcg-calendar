
// /app/app/admin/ProfilesTab.tsx
import React from "react";
import { prisma } from "../../app/lib/prisma";
import { enableAndSeedSelected, toggleInstallEnabled } from "./db/actions";

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

export default async function ProfilesTab() {
  const installs = await getInstalls();

  return (
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
                        row.enabled
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {row.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td className="py-2 px-3 align-middle">
                    <form action={toggleInstallEnabled} className="inline-flex items-center gap-2">
                      <input type="hidden" name="id" value={row.id} />
                      <input
                        type="hidden"
                        name="enabled"
                        value={row.enabled ? "false" : "true"}
                      />
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
  );
}
``
