// /app/app/calendar/page.tsx
import SiteShell from "../components/SiteShell";
import { headers } from "next/headers";
import CalendarSignInGate from "./SignInGate";
import {
  listEventsByDateRangeAndFilters,
  listUpcomingUndefined,
  hasEventsInDateRange,
} from "../../data/calendar/calendarRepo";
import {
  addEventComment,
  setUserSubscription,
  deleteCommentIfAllowed,
  isAdminByPrefs,
} from "../../data/admin/adminRepo";
import ClientCalendar from "./ClientCalendar";
import { mapReleaseEventsToCalendar } from "./mapEvents";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import FilterBar from "./FilterBar";
import { TypeBadge, StatusBadge } from "../ui/Badges";
import Tabs from "./Tabs";
import MonthSwitcher from "./MonthSwitcher";
import EventDrawer from "./EventDrawer";
import { getSession } from "../auth";

export async function subscribeAction(formData: FormData) {
  "use server";
  // ✅ Session-based user id (no cookie parsing)
  const session = await getSession();
  const userId = session?.user?.id ?? null;

  if (!userId) {
    redirect("/calendar?ok=0&msg=not%20signed%20in");
  }

  const installId = String(formData.get("installId") ?? "");
  const subscribe = String(formData.get("subscribe") ?? "") === "true";

  if (!installId) {
    redirect("/calendar?ok=0&msg=missing%20installId");
  }

  await setUserSubscription(userId!, installId, subscribe);
  revalidatePath("/calendar");
  redirect("/calendar?ok=1");
}

export async function commentAction(formData: FormData) {
  "use server";
  // ✅ Session-based user id (no cookie parsing)
  const session = await getSession();
  const userId = session?.user?.id ?? null;

  if (!userId) {
    redirect("/calendar?ok=0&msg=not%20signed%20in");
  }

  const eventId = String(formData.get("eventId") ?? "");
  const content = String(formData.get("content") ?? "").trim();

  if (!eventId) {
    redirect("/calendar?ok=0&msg=missing%20eventId");
  }
  if (!content) {
    redirect("/calendar?ok=0&msg=empty%20comment");
  }

  await addEventComment(eventId, userId!, content);
  revalidatePath("/calendar");
  redirect("/calendar?ok=1");
}

export async function deleteCommentAction(formData: FormData) {
  "use server";
  // ✅ Session-based user id (no cookie parsing)
  const session = await getSession();
  const userId = session?.user?.id ?? null;

  if (!userId) {
    redirect("/calendar?ok=0&msg=not%20signed%20in");
  }

  const commentId = String(formData.get("commentId") ?? "");
  if (!commentId) {
    redirect("/calendar?ok=0&msg=missing%20commentId");
  }

  await deleteCommentIfAllowed(commentId, userId!);

  // Revalidate and return to the previous URL if available
  revalidatePath("/calendar");
  const hs = await headers();
  const back = hs.get("referer") ?? "/calendar?ok=1";
  redirect(back);
}


import { absUrl, fmtDate } from "../lib/utils";

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function firstStr(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function parseCsvInput(input?: string | string[]): string[] | undefined {
  const raw = firstStr(input);
  if (!raw) return undefined;
  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}


// Build a new /calendar URL with updated query, preserving existing keys
function buildUrlWith(
  sp: Record<string, string | string[]>,
  updates: Record<string, string[] | undefined>,
): string {
  const qp = new URLSearchParams();

  // Copy existing params except those we’ll overwrite
  for (const [k, v] of Object.entries(sp)) {
    if (Object.prototype.hasOwnProperty.call(updates, k)) continue;
    if (Array.isArray(v)) v.forEach((x) => qp.append(k, x));
    else if (v) qp.append(k, v);
  }

  // Apply updates
  for (const [k, arr] of Object.entries(updates)) {
    if (!arr || arr.length === 0) continue;
    arr.forEach((x) => qp.append(k, x));
  }

  const qs = qp.toString();
  return qs ? `/calendar?${qs}` : `/calendar`;
}

// Static enum lists for filters (can be centralized later)
const ALL_TYPES = ["shelf", "prerelease", "promo", "special"] as const;
const ALL_STATUS = [
  "announced",
  "confirmed",
  "delayed",
  "canceled",
  "rumor",
] as const;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const sp = (searchParams ? await searchParams : undefined) ?? {};

  const ok = firstStr(sp.ok);
  const msg = firstStr(sp.msg);

  const installIds = parseCsvInput(sp.installIds);
  const types = parseCsvInput(sp.types);
  const status = parseCsvInput(sp.status);
  const search = firstStr(sp.search)?.trim() || undefined;

  // ym = "YYYY-MM" (e.g., 2026-02)
  const ym = firstStr(sp.ym);
  let currentMonthDate: Date;

  if (ym && /^\d{4}-\d{2}$/.test(ym)) {
    const [y, m] = ym.split("-").map((n) => parseInt(n, 10));
    currentMonthDate = new Date(y, m - 1, 1);
  } else {
    const now = new Date();
    currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // Parse month helpers
  function parseYM(ym?: string | string[] | undefined): Date {
    const raw = firstStr(ym);
    if (raw && /^\d{4}-\d{2}$/.test(raw)) {
      const [y, m] = raw.split("-").map((n) => parseInt(n, 10));
      return new Date(y, m - 1, 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  function monthRange(d: Date) {
    const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  // Calendar tab month (param: ym - already used by RBC)
  const calMonth = parseYM(sp.ym);
  const rangeCalendar = monthRange(calMonth);

  // Events List tab month (param: ymList)
  const listMonth = parseYM(sp.ymList);
  const rangeList = monthRange(listMonth);

  // Upcoming tab month scope (param: ymUpcoming)
  const upMonth = parseYM(sp.ymUpcoming);
  const rangeUpcoming = monthRange(upMonth);
  const filters = { installIds, types, status, search };

  const [inRangeCalendar, inRangeList, upcomingUndef, session] = await Promise.all([
    listEventsByDateRangeAndFilters(rangeCalendar, filters),
    listEventsByDateRangeAndFilters(rangeList, { ...filters, excludePast: true }),
    listUpcomingUndefined({ installIds }), // TBD + future WINDOW (existing repo call)
    getSession(),
  ]);

  function shiftMonth(d: Date, months: number) {
    const next = new Date(d);
    next.setMonth(next.getMonth() + months, 1);
    return next;
  }

  const [listPrevHasEvents, listNextHasEvents] = await Promise.all([
    hasEventsInDateRange(monthRange(shiftMonth(listMonth, -1)), {
      ...filters,
      excludePast: true,
    }),
    hasEventsInDateRange(monthRange(shiftMonth(listMonth, 1)), {
      ...filters,
      excludePast: true,
    }),
  ]);

  function hasUpcomingInMonth(monthDate: Date) {
    const { start, end } = monthRange(monthDate);
    return upcomingUndef.some((ev: any) => {
      if (ev.dateType === "TBD") return true;
      if (ev.dateType === "WINDOW") {
        const ws = ev.windowStart ? new Date(ev.windowStart) : null;
        const we = ev.windowEnd ? new Date(ev.windowEnd) : null;
        if (!ws || !we) return false;
        return !(we < start || ws > end);
      }
      return false;
    });
  }

  const upcomingPrevHasEvents = hasUpcomingInMonth(shiftMonth(upMonth, -1));
  const upcomingNextHasEvents = hasUpcomingInMonth(shiftMonth(upMonth, 1));

  function fmtDate(d?: string | Date | null): string {
    if (!d) return "";
    const iso = typeof d === "string" ? d : d.toISOString();
    return new Date(iso).toISOString().slice(0, 10);
  }

  // Keep TBD always; for WINDOW, only those intersecting rangeUpcoming
  const upcomingForTab = upcomingUndef.filter((ev: any) => {
    if (ev.dateType === "TBD") return true;
    if (ev.dateType === "WINDOW") {
      const ws = ev.windowStart ? new Date(ev.windowStart) : null;
      const we = ev.windowEnd ? new Date(ev.windowEnd) : null;
      if (!ws || !we) return false;
      // intersect with selected month range
      return !(we < rangeUpcoming.start || ws > rangeUpcoming.end);
    }
    return false;
  });

  // Determine active tab once
  const activeTab = (firstStr(sp.tab) ?? "calendar") as
    | "calendar"
    | "list"
    | "upcoming";

  // ✅ Session-based signed-in state (no cookies)
  const userId = session?.user?.id ?? null;
  const signedIn = !!userId;
  const eventId = firstStr(sp.event) ?? null;

  return (
    <SiteShell current="calendar" title="Release Calendar">
      {ok && (
        <div
          className={`rounded border px-3 py-2 text-sm ${
            ok === "1"
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {ok === "1" ? "Success" : "Action failed"}
          {msg ? ` — ${decodeURIComponent(msg)}` : ""}
        </div>
      )}
      <EventDrawer eventId={eventId} sp={sp as any} />
      {!userId && <CalendarSignInGate />}

      {/* Tabs row */}
      <div className="flex items-center justify-between mb-4">
        <Tabs />
        {/* Per-tab month switchers (Calendar uses its own RBC toolbar; we provide for List/Upcoming) */}
        <div className="flex items-center gap-4">{/* reserved */}</div>
      </div>

      <div className="flex flex-col lg:flex-row gap-2">
        <div className="w-full order-2 min-w-0 lg:order-1 lg:flex-1 lg:max-w-full">
          {/* Tab: Calendar */}
      {activeTab === "calendar" && (
        <section className="space-y-2">
          <div className="rounded-card border shadow-card bg-white p-3">
            <h2 className="text-lg font-semibold">
              Calendar —{" "}
              {calMonth.toLocaleString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </h2>

            <div className="mt-4 overflow-x-auto">
              <div className="min-w-full">
                <ClientCalendar
                  events={mapReleaseEventsToCalendar(inRangeCalendar)}
                  defaultDate={calMonth}
                />
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-600 flex flex-wrap gap-4 px-1">
            <span>
              <span className="inline-block w-2 h-2 bg-gray-800 rounded-sm mr-2"></span>
              EXACT (single day)
            </span>
            <span>
              <span className="inline-block w-2 h-2 bg-gray-400 rounded-sm mr-2"></span>
              RANGE (multi‑day)
            </span>
            <span>
              <span className="inline-block w-2 h-2 bg-gray-300 rounded-sm mr-2"></span>
              WINDOW (multi‑day)
            </span>
            <span className="text-gray-400">TBD is in “Upcoming” tab</span>
          </div>
        </section>
      )}

      {/* Tab: Events List (Selected Month) */}
      {activeTab === "list" && (
        <section className="rounded-card border shadow-card bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">
              Events List —{" "}
              <MonthSwitcher
                param="ymList"
                value={firstStr(sp.ymList) ?? undefined}
                canPrev={listPrevHasEvents}
                canNext={listNextHasEvents}
              />
            </h2>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-300 w-full text-xs">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-1 px-2 w-[18%]">Product Set</th>
                  <th className="py-1 px-2 w-[10%]">Type</th>
                  <th className="py-1 px-2 w-[10%]">Date Type</th>
                  <th className="py-1 px-2 w-[10%]">Exact</th>
                  <th className="py-1 px-2 w-[12%]">Range</th>
                  <th className="py-1 px-2 w-[12%]">Window</th>
                  <th className="py-1 px-2 w-[10%]">Status</th>
                  <th className="py-1 px-2 w-[8%]">Sources</th>
                  <th className="py-1 px-2 w-[10%]">Comments</th>
                </tr>
              </thead>
              <tbody>
                {inRangeList.map((ev: any) => (
                  <tr key={ev.id} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-4">
                      <a
                        href={buildUrlWith(sp as any, { event: [ev.id] })}
                        className="text-blue-700 hover:underline"
                        title="Open event details"
                      >
                        {ev.productSet?.name ?? "(set)"}
                      </a>
                    </td>
                    <td className="py-2 pr-4">
                      <TypeBadge variant={ev.type} />
                    </td>
                    <td className="py-2 pr-4">{ev.dateType}</td>
                    <td className="py-2 pr-4">{fmtDate(ev.dateExact)}</td>
                    <td className="py-2 pr-4">
                      {fmtDate(ev.dateStart)} {ev.dateStart || ev.dateEnd ? "—" : ""}{" "}
                      {fmtDate(ev.dateEnd)}
                    </td>
                    <td className="py-2 pr-4">
                      {fmtDate(ev.windowStart)}{" "}
                      {ev.windowStart || ev.windowEnd ? "—" : ""}{" "}
                      {fmtDate(ev.windowEnd)}
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge variant={ev.status} />
                    </td>
                    <td className="py-2 pr-4">
                      {ev.sourceClaims?.length ?? 0}
                    </td>
                    <td className="py-2 pr-4">
                      <EventComments eventId={ev.id} signedIn={signedIn} />
                    </td>
                  </tr>
                ))}
                {inRangeList.length === 0 && (
                  <tr>
                    <td className="py-3 text-gray-500" colSpan={9}>
                      No events for this month.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab: Upcoming (TBD / future WINDOW) */}
      {activeTab === "upcoming" && (
        <section className="rounded-card border shadow-card bg-white p-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold">
              Upcoming —{" "}
              <MonthSwitcher
                param="ymUpcoming"
                value={firstStr(sp.ymUpcoming) ?? undefined}
                canPrev={upcomingPrevHasEvents}
                canNext={upcomingNextHasEvents}
              />
            </h2>
          </div>
          <div className="text-xs text-gray-500">
            TBD always visible; WINDOW filtered to the selected month.
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-300 w-full text-xs">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Product Set</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Date Type</th>
                  <th className="py-2 pr-4">Window/TBD</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Sources</th>
                  <th className="py-2 pr-4">Comments</th>
                </tr>
              </thead>
              <tbody>
                {upcomingForTab.map((ev: any) => (
                  <tr key={ev.id} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-4">
                      <a
                        href={buildUrlWith(sp as any, { event: [ev.id] })}
                        className="text-blue-700 hover:underline"
                        title="Open event details"
                      >
                        {ev.productSet?.name ?? "(set)"}
                      </a>
                    </td>
                    <td className="py-2 pr-4">
                      <TypeBadge variant={ev.type} />
                    </td>
                    <td className="py-2 pr-4">{ev.dateType}</td>
                    <td className="py-2 pr-4">
                      {ev.dateType === "TBD"
                        ? "TBD"
                        : `${fmtDate(ev.windowStart)} — ${fmtDate(ev.windowEnd)}`}
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge variant={ev.status} />
                    </td>
                    <td className="py-2 pr-4">
                      {ev.sourceClaims?.length ?? 0}
                    </td>
                    <td className="py-2 pr-4">
                      <EventComments eventId={ev.id} signedIn={signedIn} />
                    </td>
                  </tr>
                ))}
                {upcomingForTab.length === 0 && (
                  <tr>
                    <td className="py-3 text-gray-500" colSpan={7}>
                      No items for this month.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
        </div>

        <aside className="w-full order-1 lg:order-2 lg:w-72 shrink-0 rounded-card border shadow-card bg-white p-3 sticky top-24 self-start">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Filters</h3>
            <div className="flex items-center gap-2">
              <a
                href={`/calendar?tab=${encodeURIComponent(firstStr(sp.tab) ?? "calendar")}`}
                className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50"
                title="Reset filters"
              >
                Reset
              </a>
              <button
                type="submit"
                form="filter-form"
                className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
          <FilterBar sp={sp as any} />
        </aside>
      </div>
    </SiteShell>
  );
}

/** Installed Profiles (enabled only) with subscribe/unsubscribe buttons. */
async function InstalledProfilesList({ signedIn }: { signedIn: boolean }) {
  const hs = await headers();
  const cookie = hs.get("cookie") ?? "";

  const [installsRes, subsRes] = await Promise.all([
    fetch(await absUrl("/api/admin/installs"), {
      cache: "no-store",
      headers: { cookie },
    }),
    fetch(await absUrl("/api/user/subscriptions"), {
      cache: "no-store",
      headers: { cookie },
    }),
  ]);

  // Parse installs strictly according to your endpoint shape: { ok, installs: [...] }
  let installs: Array<{ id: string; enabled: boolean; packageId: string }> = [];
  if (installsRes.ok) {
    try {
      const json = await installsRes.json();
      if (
        json &&
        typeof json === "object" &&
        Array.isArray((json as any).installs)
      ) {
        installs = (json as any).installs;
      }
    } catch {
      installs = [];
    }
  }

  // Parse subscriptions defensively: handle { subscriptions: [] } or error/empty
  let subs: string[] = [];
  if (subsRes.ok) {
    try {
      const subsJson = await subsRes.json();
      if (
        subsJson &&
        typeof subsJson === "object" &&
        Array.isArray((subsJson as any).subscriptions)
      ) {
        subs = (subsJson as any).subscriptions;
      }
    } catch {
      subs = [];
    }
  }
  const enabledInstalls = (Array.isArray(installs) ? installs : []).filter(
    (i: any) => i?.enabled === true,
  );

  return (
    <ul className="divide-y">
      {enabledInstalls.map((i) => {
        const subscribed = subs.includes(i.id);
        return (
          <li key={i.id} className="py-2 flex items-center justify-between">
            <div>
              <div className="font-medium">{i.packageId}</div>
              <div className="text-xs text-gray-500">
                install {i.id.slice(0, 8)}…
              </div>
            </div>

            {signedIn ? (
              <form action={subscribeAction}>
                <input type="hidden" name="installId" value={i.id} />
                <input
                  type="hidden"
                  name="subscribe"
                  value={(!subscribed).toString()}
                />
                <button
                  type="submit"
                  className={`px-2 py-1 rounded border text-xs ${
                    subscribed ? "bg-green-50" : "bg-white"
                  }`}
                  title={subscribed ? "Unsubscribe" : "Subscribe"}
                >
                  {subscribed ? "Unsubscribe" : "Subscribe"}
                </button>
              </form>
            ) : (
              <span className="text-xs text-gray-500">
                Sign in to subscribe
              </span>
            )}
          </li>
        );
      })}
      {enabledInstalls.length === 0 && (
        <li className="py-2 text-sm text-gray-500">No enabled installs.</li>
      )}
    </ul>
  );
}

/** Per-event comments widget using UserNote.content via Pages API. */
export async function EventComments({
  eventId,
  signedIn,
}: {
  eventId: string;
  signedIn: boolean;
}) {
  // Forward session cookie to Pages API
  const baseRes = await fetch(await absUrl(`/api/events/${eventId}/comments`), {
    cache: "no-store",
    headers: { cookie: (await headers()).get("cookie") ?? "" },
  });
  const json = baseRes.ok ? await baseRes.json() : { comments: [] as any[] };
  const comments: Array<{
    id: string;
    content: string;
    user?: { id?: string; name?: string };
  }> = json.comments ?? [];

  // ✅ Determine user + admin via session + DB (no cookies, no role checks)
  const session = await getSession();
  const currentUserId = session?.user?.id ?? null;
  const isAdmin = currentUserId ? await isAdminByPrefs(currentUserId) : false;

  const visibleComments = isAdmin
    ? comments
    : currentUserId
    ? comments.filter((c) => c.user?.id === currentUserId)
    : [];

  return (
    <div className="space-y-2">
      {signedIn ? (
        <form action={commentAction} className="flex items-center gap-2">
          <input type="hidden" name="eventId" value={eventId} />

          <input
            name="content"
            type="text"
            className="border rounded px-2 py-1 flex-1"
            placeholder="Add a comment"
            required
            maxLength={1000}
          />
          <button
            type="submit"
            className="px-2 py-1 rounded bg-gray-800 text-white text-xs"
          >
            Post
          </button>
        </form>
      ) : (
        <p className="text-xs text-gray-500">Sign in to add comments.</p>
      )}

      {visibleComments.length === 0 ? (
        <p className="text-xs text-gray-500">
          You haven’t added any comments yet.
        </p>
      ) : (
        <ul className="space-y-1">
          {visibleComments.map((c) => {
            const canDelete =
              !!currentUserId && (isAdmin || c.user?.id === currentUserId);
            return (
              <li
                key={c.id}
                className="text-xs flex items-start justify-between gap-2"
              >
                <div className="flex-1">
                  <span className="font-medium">
                    {c.user?.name ?? "User"}
                  </span>{" "}
                  <span className="text-gray-700">— {c.content}</span>
                </div>

                {canDelete && (
                  <form action={deleteCommentAction}>
                    <input type="hidden" name="commentId" value={c.id} />
                    <button
                      type="submit"
                      title="Delete comment"
                      className="text-gray-500 hover:text-rose-600 p-1"
                      aria-label="Delete comment"
                    >
                      {/* Trash icon (inline SVG) */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.5 3a1 1 0 00-.894.553L7.382 4H5a1 1 0 100 2h.278l.77 9.242A2 2 0 008.043 17h3.914a2 2 0 001.995-1.758L14.722 6H15a1 1 0 100-2h-2.382l-.224-.447A1 1 0 0011.5 3h-3zM9 7a1 1 0 012 0v7a1 1 0 11-2 0V7z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}