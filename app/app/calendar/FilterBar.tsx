// /app/app/calendar/FilterBar.tsx
import React from "react";
import { headers } from "next/headers";
import { absUrl } from "./absUrlHelper";
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
  const ymList = firstStr(sp.ymList) ?? "";
  const ymUpcoming = firstStr(sp.ymUpcoming) ?? "";
  const tab = firstStr(sp.tab) ?? "calendar";

  const hasFilters =
    selectedTypes.length || selectedStatus.length || selectedInstalls.length || search;

  return (
    <form id="filter-form" method="get" className="w-full">
      <input type="hidden" name="tab" value={tab} />
      {ym ? <input type="hidden" name="ym" value={ym} /> : null}
      {ymList ? <input type="hidden" name="ymList" value={ymList} /> : null}
      {ymUpcoming ? <input type="hidden" name="ymUpcoming" value={ymUpcoming} /> : null}

      <div className="flex flex-col gap-3 bg-white rounded-card border shadow-card px-3 py-2">
        <input
          className="text-sm border rounded px-2 py-1 w-full"
          name="search"
          placeholder="Search sets…"
          defaultValue={search}
        />
        <div className="flex flex-col gap-2">
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

        {/* Active filters chips */}
        {hasFilters && (
          <div className="flex flex-col gap-1">
            {selectedTypes.map((t) => (
              <span key={`type-${t}`} className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                {t}
              </span>
            ))}
            {selectedStatus.map((s) => (
              <span key={`status-${s}`} className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                {s}
              </span>
            ))}
            {selectedInstalls.map((i) => (
              <span key={`install-${i}`} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                {i.slice(0, 6)}…
              </span>
            ))}
            {search && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Search: {search}</span>
            )}
          </div>
        )}

      </div>
    </div>
    </form>
  );
}
