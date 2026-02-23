// /app/app/calendar/FilterBar.tsx
import React from "react";
import { headers } from "next/headers";
import { absUrl } from "./absUrlHelper"; // we'll add this tiny helper below
import { firstStr, parseCsvInput, buildUrlWith } from "./helpers"; // reuse helpers you already have or inline

const ALL_TYPES = ["shelf", "prerelease", "promo", "special"] as const;
const ALL_STATUS = [
  "announced",
  "confirmed",
  "delayed",
  "canceled",
  "rumor",
] as const;

type SP = Record<string, string | string[]>;

export default async function FilterBar({ sp }: { sp: SP }) {
  const hs = await headers();
  const cookie = hs.get("cookie") ?? "";

  // Load enabled installs for the dropdown list
  const res = await fetch(await absUrl("/api/admin/installs"), {
    cache: "no-store",
    headers: { cookie },
  });

  let installs: Array<{ id: string; packageId: string; enabled: boolean }> = [];
  if (res.ok) {
    try {
      const json = await res.json();
      if (
        json &&
        typeof json === "object" &&
        Array.isArray((json as any).installs)
      ) {
        installs = (json as any).installs.filter(
          (i: any) => i?.enabled === true,
        );
      }
    } catch {
      /* noop */
    }
  }

  const selectedTypes = parseCsvInput(sp.types) ?? [];
  const selectedStatus = parseCsvInput(sp.status) ?? [];
  const selectedInstalls = parseCsvInput(sp.installIds) ?? [];
  const search = firstStr(sp.search) ?? "";
  const ym = firstStr(sp.ym) ?? "";

  return (
    <form method="get" className="w-full">
      {/* Preserve current month selection */}
      {ym ? <input type="hidden" name="ym" value={ym} /> : null}

      <div className="flex flex-wrap items-center gap-2 bg-white rounded-card border shadow-card px-3 py-2">
        {/* Types */}
        <details className="group relative">
          <summary className="cursor-pointer text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50">
            Types {selectedTypes.length ? `(${selectedTypes.length})` : ""}
          </summary>
          <div className="absolute z-10 mt-1 w-56 rounded border bg-white shadow p-2">
            <div className="max-h-56 overflow-auto space-y-1 text-sm">
              {ALL_TYPES.map((t) => {
                const checked = selectedTypes.includes(t);
                return (
                  <label key={t} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="types"
                      value={t}
                      defaultChecked={checked}
                    />
                    <span className="capitalize">{t}</span>
                  </label>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between text-xs">
              {(() => {
                const current = (parseCsvInput(sp.types) ?? []) as string[];
                const allUrl = buildUrlWith(sp as any, {
                  types: [...ALL_TYPES],
                });
                const clrUrl = buildUrlWith(sp as any, { types: undefined });
                return (
                  <>
                    <a href={clrUrl} className="text-blue-600 hover:underline">
                      Clear
                    </a>
                    <a href={allUrl} className="text-blue-600 hover:underline">
                      Select all
                    </a>
                  </>
                );
              })()}
            </div>
          </div>
        </details>

        {/* Status */}
        <details className="group relative">
          <summary className="cursor-pointer text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50">
            Status {selectedStatus.length ? `(${selectedStatus.length})` : ""}
          </summary>
          <div className="absolute z-10 mt-1 w-56 rounded border bg-white shadow p-2">
            <div className="max-h-56 overflow-auto space-y-1 text-sm">
              {ALL_STATUS.map((s) => {
                const checked = selectedStatus.includes(s);
                return (
                  <label key={s} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="status"
                      value={s}
                      defaultChecked={checked}
                    />
                    <span className="capitalize">{s}</span>
                  </label>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between text-xs">
              {(() => {
                const current = (parseCsvInput(sp.status) ?? []) as string[];
                const allUrl = buildUrlWith(sp as any, {
                  status: [...ALL_STATUS],
                });
                const clrUrl = buildUrlWith(sp as any, { status: undefined });
                return (
                  <>
                    <a href={clrUrl} className="text-blue-600 hover:underline">
                      Clear
                    </a>
                    <a href={allUrl} className="text-blue-600 hover:underline">
                      Select all
                    </a>
                  </>
                );
              })()}
            </div>
          </div>
        </details>

        {/* Installed Profiles */}
        <details className="group relative">
          <summary className="cursor-pointer text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50">
            Installs{" "}
            {selectedInstalls.length ? `(${selectedInstalls.length})` : ""}
          </summary>
          <div className="absolute z-10 mt-1 w-64 rounded border bg-white shadow p-2">
            <div className="max-h-56 overflow-auto space-y-1 text-sm">
              {installs.length === 0 && (
                <div className="text-xs text-gray-500 px-1">
                  No enabled installs
                </div>
              )}
              {installs.map((i) => {
                const checked = selectedInstalls.includes(i.id);
                return (
                  <label key={i.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="installIds"
                      value={i.id}
                      defaultChecked={checked}
                    />
                    <span className="font-medium">{i.packageId}</span>
                    <span className="text-[11px] text-gray-500">
                      ({i.id.slice(0, 6)}…)
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between text-xs">
              {(() => {
                const ids = installs.map((i) => i.id); // installs already filtered to enabled above
                const allUrl = buildUrlWith(sp as any, { installIds: ids });
                const clrUrl = buildUrlWith(sp as any, {
                  installIds: undefined,
                });
                return (
                  <>
                    <a href={clrUrl} className="text-blue-600 hover:underline">
                      Clear
                    </a>
                    <a href={allUrl} className="text-blue-600 hover:underline">
                      Select all
                    </a>
                  </>
                );
              })()}
            </div>
          </div>
        </details>

        {/* Search (minimal) */}
        <input
          className="text-xs border rounded px-2 py-1 w-55"
          name="search"
          placeholder="Search sets…"
          defaultValue={search}
        />

        {/* Apply & Reset */}
        <div className="ml-auto flex items-center gap-2">
          <a
            href="/calendar"
            className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
            title="Reset filters"
          >
            Reset
          </a>
          <button
            type="submit"
            className="text-xs px-3 py-1 rounded bg-brandAccent-600 text-white hover:bg-brandAccent-700"
          >
            Apply
          </button>
        </div>
      </div>
    </form>
  );
}
