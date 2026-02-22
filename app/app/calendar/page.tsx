
// /app/app/calendar/page.tsx
import SiteShell from '../components/SiteShell';
import { cookies } from 'next/headers';
import { headers } from 'next/headers';
import Link from 'next/link';
import { listEventsByDateRangeAndFilters, listUpcomingUndefined } from '../data/prismaRepo';
import ClientCalendar from './ClientCalendar';
import { mapReleaseEventsToCalendar } from './mapEvents';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { addEventComment, setUserSubscription } from '../data/prismaRepo';


export async function subscribeAction(formData: FormData) {
  'use server';
  const hs = await headers();
  const cookie = hs.get('cookie') ?? '';
  // In server actions, we can read cookies via headers or next/headers cookies()
  const userIdMatch = /(?:^|;\s*)userId=([^;]+)/.exec(cookie);
  const userId = userIdMatch?.[1] ?? null;

  if (!userId) {
    redirect('/calendar?ok=0&msg=not%20signed%20in');
  }

  const installId = String(formData.get('installId') ?? '');
  const subscribe = String(formData.get('subscribe') ?? '') === 'true';

  if (!installId) {
    redirect('/calendar?ok=0&msg=missing%20installId');
  }

  await setUserSubscription(userId!, installId, subscribe);
  revalidatePath('/calendar');
  redirect('/calendar?ok=1');
}

export async function commentAction(formData: FormData) {
  'use server';
  const hs = await headers();
  const cookie = hs.get('cookie') ?? '';
  const userIdMatch = /(?:^|;\s*)userId=([^;]+)/.exec(cookie);
  const userId = userIdMatch?.[1] ?? null;

  if (!userId) {
    redirect('/calendar?ok=0&msg=not%20signed%20in');
  }

  const eventId = String(formData.get('eventId') ?? '');
  const content = String(formData.get('content') ?? '').trim();

  if (!eventId) {
    redirect('/calendar?ok=0&msg=missing%20eventId');
  }
  if (!content) {
    redirect('/calendar?ok=0&msg=empty%20comment');
  }

  await addEventComment(eventId, userId!, content);
  revalidatePath('/calendar');
  redirect('/calendar?ok=1');
}

async function absUrl(path: string) {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  if (!host) {
    // Fallback for local dev if headers are absent
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    return `${base}${path}`;
  }
  return `${proto}://${host}${path}`;
}


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
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function fmtDate(d?: string | Date | null): string {
  if (!d) return '';
  const iso = typeof d === 'string' ? d : d.toISOString();
  return new Date(iso).toISOString().slice(0, 10);
}

async function InstallFilterCheckboxes({ selected, sp }: { selected: string[]; sp: Record<string, string | string[]> }) {
  // Forward cookies to API (not strictly needed for installs, but consistent)
  const hs = await headers();
  const cookie = hs.get('cookie') ?? '';
  const res = await fetch(await absUrl('/api/admin/installs'), {
    cache: 'no-store',
    headers: { cookie },
  });

  // Parse { ok, installs: [...] } safely
  let installs: Array<{ id: string; packageId: string; enabled: boolean }> = [];
  if (res.ok) {
    try {
      const json = await res.json();
      if (json && typeof json === 'object' && Array.isArray((json as any).installs)) {
        installs = (json as any).installs;
      }
    } catch {
      // ignore
    }
  }

  const enabled = installs.filter((i) => i.enabled);

  return (
    <details className="border rounded p-2 max-w-sm bg-white">
      <summary className="cursor-pointer text-sm font-medium select-none">
        Installed Profiles
      </summary>
      <div className="mt-2 space-y-1 max-h-64 overflow-auto pr-1">
        {enabled.length === 0 && (
          <div className="text-xs text-gray-500">No enabled installs</div>
        )}
        {enabled.map((i) => {
          const checked = selected.includes(i.id);
          return (
            <label key={i.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="installIds"
                value={i.id}
                defaultChecked={checked}
              />
              <span className="font-medium">{i.packageId}</span>
              <span className="text-xs text-gray-500">({i.id.slice(0, 6)}…)</span>
            </label>
          );
        })}
      </div>
<div className="mt-2 flex gap-3 text-xs">
  {(() => {
    const ids = enabled.map((i) => i.id);
    const current = selected;
    const allUrl = buildUrlWith((sp as any), { installIds: ids }); // NOTE: needs current sp in scope
    const clrUrl = buildUrlWith((sp as any), { installIds: undefined });
    return (
      <>
        <a href={allUrl} className="text-blue-600 hover:underline">Select all</a>
        <a href={clrUrl} className="text-blue-600 hover:underline">Clear</a>
        <span className="text-gray-500">({current.length} selected)</span>
      </>
    );
  })()}
</div>

    </details>
  );
}

// Build a new /calendar URL with updated query, preserving existing keys
function buildUrlWith(sp: Record<string, string | string[]>, updates: Record<string, string[] | undefined>): string {
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
const ALL_TYPES = ['shelf', 'prerelease', 'promo', 'special'] as const;
const ALL_STATUS = ['announced', 'confirmed', 'delayed', 'canceled', 'rumor'] as const;


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
  const [y, m] = ym.split('-').map((n) => parseInt(n, 10));
  currentMonthDate = new Date(y, m - 1, 1);
} else {
  const now = new Date();
  currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
}

// Month range: from 1st 00:00:00.000 to last day 23:59:59.999
const startOfMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1, 0, 0, 0, 0);
const endOfMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0, 23, 59, 59, 999);

const range = { start: startOfMonth, end: endOfMonth };

  const filters = { installIds, types, status, search };

  const [inRange, upcomingUndef] = await Promise.all([
    listEventsByDateRangeAndFilters(range, filters),
    listUpcomingUndefined({ installIds }),
  ]);

  
const store = await cookies();
const userId = store.get('userId')?.value ?? null;


  
return (
  <SiteShell current="calendar" title="Release Calendar">

      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Release Calendar</h1>
        <Link href="/admin" className="text-sm underline">
          Admin
        </Link>
      </header>

      {ok && (
        <div className={`rounded border px-3 py-2 text-sm ${ok === '1' ? 'border-green-300 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-800'}`}>
          {ok === '1' ? 'Success' : 'Action failed'}
          {msg ? ` — ${decodeURIComponent(msg)}` : ''}
        </div>
      )}

      {!userId && (
        <section className="space-y-2 rounded border p-4">
          <h2 className="text-lg font-medium">Set your name</h2>
          <form action="/api/user/init" method="post" className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-sm">
                <span className="block">Name</span>
                <input
                  className="border px-2 py-1 w-full"
                  name="name"
                  type="text"
                  placeholder="Your name"
                  required
                />
              </label>
              <label className="text-sm">
                <span className="block">Email</span>
                <input
                  className="border px-2 py-1 w-full"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                />
              </label>
            </div>
            <button type="submit" className="border px-3 py-1 rounded bg-blue-600 text-white">
              Save
            </button>
          </form>
          <p className="text-xs text-gray-600">We’ll set a secure cookie on this device.</p>
        </section>
      )}

      <section className="rounded-card border shadow-card bg-white p-4 space-y-3">
        <h1 className="text-xl font-semibold">Calendar — Filter</h1>
        <form method="get" className="space-y-2">
          
          
<div>
  
{/* Types (collapsible with checkboxes) */}
<details className="border rounded p-2 max-w-sm bg-white">
  <summary className="cursor-pointer text-sm font-medium select-none">
    Types
  </summary>
  <div className="mt-2 space-y-1">
    {['shelf','prerelease','promo','special'].map((t) => {
      const selected = (parseCsvInput(sp.types) ?? []).includes(t);
      return (
        <label key={t} className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="types" value={t} defaultChecked={selected} />
          <span className="capitalize">{t}</span>
        </label>
      );
    })}
  </div>
  
<div className="mt-2 flex gap-3 text-xs">
  {(() => {
    const current = (parseCsvInput(sp.types) ?? []) as string[];
    const allUrl = buildUrlWith(sp as any, { types: [...ALL_TYPES] });
    const clrUrl = buildUrlWith(sp as any, { types: undefined });
    return (
      <>
        <a href={allUrl} className="text-blue-600 hover:underline">Select all</a>
        <a href={clrUrl} className="text-blue-600 hover:underline">Clear</a>
        <span className="text-gray-500">({current.length} selected)</span>
      </>
    );
  })()}
</div>

</details>

</div>

          <div>
            
{/* Status (collapsible with checkboxes) */}
<details className="border rounded p-2 max-w-sm bg-white">
  <summary className="cursor-pointer text-sm font-medium select-none">
    Status
  </summary>
  <div className="mt-2 space-y-1">
    {['announced','confirmed','delayed','canceled','rumor'].map((s) => {
      const selected = (parseCsvInput(sp.status) ?? []).includes(s);
      return (
        <label key={s} className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="status" value={s} defaultChecked={selected} />
          <span className="capitalize">{s}</span>
        </label>
      );
    })}
  </div>
  
<div className="mt-2 flex gap-3 text-xs">
  {(() => {
    const current = (parseCsvInput(sp.status) ?? []) as string[];
    const allUrl = buildUrlWith(sp as any, { status: [...ALL_STATUS] });
    const clrUrl = buildUrlWith(sp as any, { status: undefined });
    return (
      <>
        <a href={allUrl} className="text-blue-600 hover:underline">Select all</a>
        <a href={clrUrl} className="text-blue-600 hover:underline">Clear</a>
        <span className="text-gray-500">({current.length} selected)</span>
      </>
    );
  })()}
</div>

</details>

          </div>

{/* Installed Profiles (collapsible with checkboxes) */}
 <section className="rounded-card border shadow-card bg-white p-4 space-y-3">
      <h2 className="text-lg font-semibold">Installed Profiles</h2>

<div>
  <InstallFilterCheckboxes selected={parseCsvInput(sp.installIds) ?? []} sp={sp as any} />
</div>
</section>

          <div>
            <label className="block text-sm">
              Search (ProductSet.name):
              <input
                className="border px-2 py-1 w-full max-w-xl"
                name="search"
                defaultValue={firstStr(sp.search) ?? ''}
                placeholder="partial set name"
              />
            </label>
          </div>
          <div className="pt-1">
            <button type="submit" className="border px-3 py-1 rounded">
              Apply
            </button>
          </div>
        </form>
      </section>

      <section className="rounded border">
        <div className="p-3 border-b">
          <h2 className="text-lg font-semibold">Installed Profiles</h2>
          <p className="text-xs text-gray-600">Subscribe to enabled profiles to follow their releases.</p>
        </div>
        <div className="p-3">
          <InstalledProfilesList signedIn={!!userId} />
        </div>
      </section>


<section className="space-y-2">
      <h2 className="text-lg font-semibold">Calendar — Selected Month</h2>
 <ClientCalendar
    events={mapReleaseEventsToCalendar(inRange)}
    defaultDate={currentMonthDate}
  />
  <p className="text-xs text-gray-500">
    Navigate months in the calendar header — this page will reload the selected month.
  </p>
</section>

        
<h2 className="text-lg font-semibold">Selected Month</h2>
<p className="text-sm text-gray-500">Events intersecting the selected month (EXACT / RANGE / WINDOW)</p>

      <div className="text-xs text-gray-600 flex flex-wrap gap-4 px-1">
        <span><span className="inline-block w-2 h-2 bg-gray-800 rounded-sm mr-2"></span>EXACT (single day)</span>
        <span><span className="inline-block w-2 h-2 bg-gray-400 rounded-sm mr-2"></span>RANGE (multi‑day)</span>
        <span><span className="inline-block w-2 h-2 bg-gray-300 rounded-sm mr-2"></span>WINDOW (multi‑day)</span>
        <span className="text-gray-400">TBD is listed in “Upcoming — Undefined”</span>
      </div>
      <section className="rounded-card border shadow-card bg-white p-4">
        <div className="mt-3 overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Product Set</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Date Type</th>
                <th className="py-2 pr-4">Exact</th>
                <th className="py-2 pr-4">Range</th>
                <th className="py-2 pr-4">Window</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Sources</th>
                <th className="py-2 pr-4">Comments</th>
              </tr>
            </thead>
            <tbody>
              {inRange.map((ev: any) => (
                <tr key={ev.id} className="border-b last:border-0 align-top">
                  <td className="py-2 pr-4">{ev.productSet?.name ?? '(set)'}</td>
                  <td className="py-2 pr-4">{ev.type}</td>
                  <td className="py-2 pr-4">{ev.dateType}</td>
                  <td className="py-2 pr-4">{fmtDate(ev.dateExact)}</td>
                  <td className="py-2 pr-4">
                    {fmtDate(ev.dateStart)} {ev.dateStart || ev.dateEnd ? '—' : ''} {fmtDate(ev.dateEnd)}
                  </td>
                  <td className="py-2 pr-4">
                    {fmtDate(ev.windowStart)} {ev.windowStart || ev.windowEnd ? '—' : ''} {fmtDate(ev.windowEnd)}
                  </td>
                  <td className="py-2 pr-4">{ev.status}</td>
                  <td className="py-2 pr-4">{ev.sourceClaims?.length ?? 0}</td>
                  <td className="py-2 pr-4">
                    <EventComments eventId={ev.id} signedIn={!!userId} />
                  </td>
                </tr>
              ))}
              {inRange.length === 0 && (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={9}>
                    No events found for the given filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-card border shadow-card bg-white p-4">
        <h2 className="text-lg font-semibold">Upcoming — Undefined (TBD / future WINDOW)</h2>
        <div className="mt-3 overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Product Set</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Date Type</th>
                <th className="py-2 pr-4">Window</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Sources</th>
                <th className="py-2 pr-4">Comments</th>
              </tr>
            </thead>
            <tbody>
              {upcomingUndef.map((ev: any) => (
                <tr key={ev.id} className="border-b last:border-0 align-top">
                  <td className="py-2 pr-4">{ev.productSet?.name ?? '(set)'}</td>
                  <td className="py-2 pr-4">{ev.type}</td>
                  <td className="py-2 pr-4">{ev.dateType}</td>
                  <td className="py-2 pr-4">
                    {fmtDate(ev.windowStart)} {ev.windowStart || ev.windowEnd ? '—' : ''} {fmtDate(ev.windowEnd)}
                  </td>
                  <td className="py-2 pr-4">{ev.status}</td>
                  <td className="py-2 pr-4">{ev.sourceClaims?.length ?? 0}</td>
                  <td className="py-2 pr-4">
                    <EventComments eventId={ev.id} signedIn={!!userId} />
                  </td>
                </tr>
              ))}
              {upcomingUndef.length === 0 && (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={7}>
                    No upcoming undefined events.
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

/** Installed Profiles (enabled only) with subscribe/unsubscribe buttons. */
async function InstalledProfilesList({ signedIn }: { signedIn: boolean }) {
  const base = process.env.NEXT_PUBLIC_BASE_URL!;



const hs = await headers();
const cookie = hs.get('cookie') ?? '';

const [installsRes, subsRes] = await Promise.all([
  fetch(await absUrl('/api/admin/installs'), {
    cache: 'no-store',
    headers: { cookie },
  }),
  fetch(await absUrl('/api/user/subscriptions'), {
    cache: 'no-store',
    headers: { cookie },
  }),
]);


// Parse installs strictly according to your endpoint shape: { ok, installs: [...] }
let installs: Array<{ id: string; enabled: boolean; packageId: string }> = [];
if (installsRes.ok) {
  try {
    const json = await installsRes.json();
    if (json && typeof json === 'object' && Array.isArray((json as any).installs)) {
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
    if (subsJson && typeof subsJson === 'object' && Array.isArray((subsJson as any).subscriptions)) {
      subs = (subsJson as any).subscriptions;
    }
  } catch {
    subs = [];
  }
}
  const enabledInstalls = (Array.isArray(installs) ? installs : []).filter((i: any) => i?.enabled === true);

  return (
    <ul className="divide-y">
      {enabledInstalls.map((i) => {
        const subscribed = subs.includes(i.id);
        return (
          <li key={i.id} className="py-2 flex items-center justify-between">
          <div>
            <div className="font-medium">{i.packageId}</div>
            <div className="text-xs text-gray-500">install {i.id.slice(0, 8)}…</div>
          </div>

            {signedIn ? (
              <form action={subscribeAction}>
                <input type="hidden" name="installId" value={i.id} />
                <input type="hidden" name="subscribe" value={(!subscribed).toString()} />
                <button
                  type="submit"
                  className={`px-2 py-1 rounded border text-xs ${subscribed ? 'bg-green-50' : 'bg-white'}`}
                  title={subscribed ? 'Unsubscribe' : 'Subscribe'}
                >
                  {subscribed ? 'Unsubscribe' : 'Subscribe'}
                </button>
              </form>
            ) : (
              <span className="text-xs text-gray-500">Set your name above to subscribe</span>
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
async function EventComments({ eventId, signedIn }: { eventId: string; signedIn: boolean }) {
const hs = await headers();
const cookie = hs.get('cookie') ?? '';

const res = await fetch(await absUrl(`/api/events/${eventId}/comments`), {
  cache: 'no-store',
  headers: { cookie },
});

  const json = res.ok ? await res.json() : { comments: [] as any[] };
  const comments: Array<{ id: string; content: string; user?: { name?: string } }> = json.comments ?? [];

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
          <button type="submit" className="px-2 py-1 rounded bg-gray-800 text-white text-xs">
            Post
          </button>
        </form>
      ) : (
        <p className="text-xs text-gray-500">Set your name above to add comments.</p>
      )}

      {comments.length === 0 ? (
        <p className="text-xs text-gray-500">No comments yet.</p>
      ) : (
        <ul className="space-y-1">
          {comments.map((c) => (
            <li key={c.id} className="text-xs">
              <span className="font-medium">{c.user?.name ?? 'User'}</span>{' '}
              <span className="text-gray-700">— {c.content}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
