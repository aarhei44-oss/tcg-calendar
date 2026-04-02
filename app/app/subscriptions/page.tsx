// /app/app/subscriptions/page.tsx
import React from "react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import SiteShell from "../components/SiteShell";
import { prisma } from "app/lib/prisma";
import { getUserSubscriptions, setUserSubscription } from "../data/prismaRepo";
import { listEventsByDateRangeAndFilters } from "app/data/prismaRepo";
import { TypeBadge, StatusBadge } from "app/ui/Badges";
import CalendarSignInGate from "../calendar/SignInGate";
import { getSession } from "../auth";

export const dynamic = "force-dynamic";

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function fmtDate(d?: string | Date | null): string {
  if (!d) return "";
  const iso = typeof d === "string" ? d : d.toISOString();
  return new Date(iso).toISOString().slice(0, 10);
}

// ---- Server Action: toggle subscription ----
export async function toggleSubscription(formData: FormData) {
  "use server";

  // ✅ Use NextAuth session (no cookie parsing)
  const session = await getSession();
  const userId = session?.user?.id ?? null;

  if (!userId) {
    redirect("/subscriptions?ok=0&msg=not%20signed%20in");
  }

  const installId = String(formData.get("installId") ?? "");
  const subscribe = String(formData.get("subscribe") ?? "") === "true";
  if (!installId) {
    redirect("/subscriptions?ok=0&msg=missing%20installId");
  }

  await setUserSubscription(userId!, installId, subscribe);
  revalidatePath("/subscriptions");
  redirect("/subscriptions?ok=1");
}

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const sp = (searchParams ? await searchParams : undefined) ?? {};
  const ok = Array.isArray(sp.ok) ? sp.ok[0] : sp.ok;
  const msg = Array.isArray(sp.msg) ? sp.msg[0] : sp.msg;

  const upcomingSearch = Array.isArray(sp.upcomingSearch) ? sp.upcomingSearch[0] : sp.upcomingSearch;
  const upcomingType = Array.isArray(sp.upcomingType) ? sp.upcomingType[0] : sp.upcomingType;
  const upcomingStatus = Array.isArray(sp.upcomingStatus) ? sp.upcomingStatus[0] : sp.upcomingStatus;
  const upcomingSort = Array.isArray(sp.upcomingSort) ? sp.upcomingSort[0] : sp.upcomingSort;

  // ✅ Session identity (no cookies)
  const session = await getSession();
  const userId = session?.user?.id ?? null;

  // Signed out → show sign-in gate only
  if (!userId) {
    return (
      <SiteShell current="subscriptions" title="Subscriptions">
        {ok && (
          <div
            className={`rounded border px-3 py-2 text-sm ${
              ok === "1"
                ? "border-green-300 bg-green-50 text-green-800"
                : "border-red-300 bg-red-50 text-red-800"
            }`}
          >
            {ok === "1" ? "Success" : "Action failed"}
            {msg ? ` — ${decodeURIComponent(msg as string)}` : ""}
          </div>
        )}

        <CalendarSignInGate />
      </SiteShell>
    );
  }

  // Load enabled installs + current subscriptions
  const [installs, subs] = await Promise.all([
    prisma.tcgProfileInstall.findMany({
      where: { enabled: true },
      select: {
        id: true,
        packageId: true,
        enabled: true,
        package: {
          select: { name: true },
        },
      },
      orderBy: { packageId: "asc" },
    }),
    getUserSubscriptions(userId),
  ]);
  const subscribed = new Set<string>(subs);

  const orderedInstalls = installs
    .slice()
    .sort((a, b) => {
      const aSub = subscribed.has(a.id) ? 1 : 0;
      const bSub = subscribed.has(b.id) ? 1 : 0;
      if (aSub !== bSub) return bSub - aSub;
      return a.packageId.localeCompare(b.packageId);
    });

  // Compute upcoming events for next 30 days, filtered to subscribed installIds
  const now = new Date();
  const upcomingRange = { start: now, end: addDays(now, 30) };
  const installIds = subs; // subs is string[] of TcgProfileInstall.id

  let upcoming: any[] = [];
  if (installIds.length > 0) {
    upcoming = await listEventsByDateRangeAndFilters(upcomingRange, {
      installIds,
    });
  }

  // Local filtering + sorting for upcoming events grid
  const upcomingFiltered = upcoming.filter((ev) => {
    const matchesSearch = upcomingSearch
      ? (ev.productSet?.name ?? "")
          .toLowerCase()
          .includes(String(upcomingSearch).toLowerCase())
      : true;
    const matchesType = upcomingType ? ev.type === upcomingType : true;
    const matchesStatus = upcomingStatus ? ev.status === upcomingStatus : true;
    return matchesSearch && matchesType && matchesStatus;
  });

  const upcomingSorted = [...upcomingFiltered].sort((a, b) => {
    if (upcomingSort === "status") return String(a.status).localeCompare(String(b.status));
    if (upcomingSort === "type") return String(a.type).localeCompare(String(b.type));
    if (upcomingSort === "name")
      return String(a.productSet?.name ?? "").localeCompare(String(b.productSet?.name ?? ""));
    // default date ascending
    const aDate = a.dateExact ? new Date(a.dateExact).getTime() : 0;
    const bDate = b.dateExact ? new Date(b.dateExact).getTime() : 0;
    return upcomingSort === "dateDesc" ? bDate - aDate : aDate - bDate;
  });

  return (
    <SiteShell current="subscriptions" title="Subscriptions">
      {ok && (
        <div
          className={`rounded border px-3 py-2 text-sm ${
            ok === "1"
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {ok === "1" ? "Success" : "Action failed"}
          {msg ? ` — ${decodeURIComponent(msg as string)}` : ""}
        </div>
      )}

      <details className="rounded-card border shadow-card bg-white overflow-hidden mb-4">
        <summary className="cursor-pointer border-b border-slate-200 bg-slate-50 px-4 py-2 font-semibold">
          Your Subscriptions (click to expand)
        </summary>
        <div className="space-y-4 p-4">
          <section className="rounded-card border shadow-card bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Your Subscriptions</h2>
              <div className="text-sm text-storm-600">{subscribed.size} selected</div>
            </div>

            <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 px-2">
          {installs.length === 0 && (
            <div className="py-4 text-sm text-gray-500">
              No enabled installs are available.
            </div>
          )}
          {orderedInstalls.map((i) => {
            const isSub = subscribed.has(i.id);
            return (
              <div
                key={i.id}
                className="py-3 flex items-center justify-between border-b border-slate-300 last:border-b-0"
              >
                <div>
                  <div className="font-medium">
                    {i.package?.name ?? i.packageId}
                  </div>
                  <div className="text-xs text-gray-500">
                    install {i.id.slice(0, 8)}…
                  </div>
                </div>
                <form
                  action={toggleSubscription}
                  className="inline-flex items-center gap-2"
                >
                  <input type="hidden" name="installId" value={i.id} />
                  <input
                    type="hidden"
                    name="subscribe"
                    value={(!isSub).toString()}
                  />
                  <button
                    type="submit"
                    className={`text-xs px-3 py-1 rounded border ${
                      isSub
                        ? "bg-green-50 border-slate-200 text-green-800 hover:bg-green-100"
                        : "bg-white hover:bg-gray-50"
                    }`}
                    title={isSub ? "Unsubscribe" : "Subscribe"}
                  >
                    {isSub ? "Unsubscribe" : "Subscribe"}
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      </section>
        </div>
      </details>

      <section className="rounded-card border shadow-card bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold">
            Upcoming from your subscriptions (next 30 days)
          </h2>
          <div className="text-sm text-storm-600">{upcoming.length} events</div>
        </div>

        <form method="get" className="mb-3 flex flex-wrap items-center gap-2">
          <input
            name="upcomingSearch"
            placeholder="Search by set name"
            defaultValue={upcomingSearch || ""}
            className="rounded border px-2 py-1 min-w-[18rem] md:min-w-[22rem] lg:min-w-[24rem] flex-1"
          />
          <select
            name="upcomingType"
            defaultValue={upcomingType || ""}
            className="rounded border px-2 py-1 min-w-[10rem]"
          >
            <option value="">All types</option>
            <option value="shelf">shelf</option>
            <option value="prerelease">prerelease</option>
            <option value="promo">promo</option>
            <option value="special">special</option>
          </select>
          <select
            name="upcomingStatus"
            defaultValue={upcomingStatus || ""}
            className="rounded border px-2 py-1"
          >
            <option value="">All status</option>
            <option value="announced">announced</option>
            <option value="confirmed">confirmed</option>
            <option value="delayed">delayed</option>
            <option value="canceled">canceled</option>
            <option value="rumor">rumor</option>
          </select>
          <select
            name="upcomingSort"
            defaultValue={upcomingSort || "dateAsc"}
            className="rounded border px-2 py-1"
          >
            <option value="dateAsc">Date ↑</option>
            <option value="dateDesc">Date ↓</option>
            <option value="name">Set name</option>
            <option value="type">Type</option>
            <option value="status">Status</option>
          </select>
          <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-white">
            Apply
          </button>
        </form>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Product Set</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Sources</th>
              </tr>
            </thead>
            <tbody>
              {upcomingSorted.map((ev: any) => (
                <tr key={ev.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    {ev.productSet?.name ?? "(set)"}
                  </td>
                  <td className="py-2 pr-4">
                    <TypeBadge variant={ev.type} />
                  </td>
                  <td className="py-2 pr-4">
                    {/* Show the best-available date, respecting type */}
                    {ev.dateType === "EXACT" && fmtDate(ev.dateExact)}
                    {ev.dateType === "RANGE" &&
                      `${fmtDate(ev.dateStart)} — ${fmtDate(ev.dateEnd)}`}
                    {ev.dateType === "WINDOW" &&
                      `${fmtDate(ev.windowStart)} — ${fmtDate(ev.windowEnd)}`}
                    {ev.dateType === "TBD" && "TBD"}
                  </td>
                  <td className="py-2 pr-4">
                    <StatusBadge variant={ev.status} />
                  </td>
                  <td className="py-2 pr-4">{ev.sourceClaims?.length ?? 0}</td>
                </tr>
              ))}
              {upcoming.length === 0 && (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={5}>
                    No upcoming events from your subscriptions in the next 30
                    days.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </SiteShell>
  );
}
