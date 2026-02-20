
// /app/app/calendar/page.tsx
import { listEventsByDateRangeAndFilters, listUpcomingUndefined } from '../data/prismaRepo';

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

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const sp = (searchParams ? await searchParams : undefined) ?? {};
  const installIds = parseCsvInput(sp.installIds);
  const types = parseCsvInput(sp.types);
  const status = parseCsvInput(sp.status);
  const search = firstStr(sp.search)?.trim() || undefined;

  const now = new Date();
  const range = { start: now, end: addDays(now, 120) };

  const filters = { installIds, types, status, search };

  const [inRange, upcomingUndef] = await Promise.all([
    listEventsByDateRangeAndFilters(range, filters),
    listUpcomingUndefined({ installIds }),
  ]);

  return (
    <main className="p-6 space-y-8">
      <section className="space-y-2">
        <h1 className="text-xl font-semibold">Calendar — Filter</h1>
        <form method="get" className="space-y-2">
          <div>
            <label className="block text-sm">
              Install IDs (CSV):
              <input
                className="border px-2 py-1 w-full max-w-xl"
                name="installIds"
                defaultValue={firstStr(sp.installIds) ?? ''}
                placeholder="id1,id2"
              />
            </label>
          </div>
          <div>
            <label className="block text-sm">
              Types (CSV):
              <input
                className="border px-2 py-1 w-full max-w-xl"
                name="types"
                defaultValue={firstStr(sp.types) ?? ''}
                placeholder="shelf,prerelease,promo,special"
              />
            </label>
          </div>
          <div>
            <label className="block text-sm">
              Status (CSV):
              <input
                className="border px-2 py-1 w-full max-w-xl"
                name="status"
                defaultValue={firstStr(sp.status) ?? ''}
                placeholder="announced,confirmed,delayed,canceled,rumor"
              />
            </label>
          </div>
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
            <button type="submit" className="border px-3 py-1">Apply</button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Next 120 Days</h2>
        <p className="text-sm text-gray-500">
          Intersections with EXACT/RANGE/WINDOW between today and +120 days.
        </p>
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
              </tr>
            </thead>
            <tbody>
              {inRange.map((ev: any) => (
                <tr key={ev.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{ev.productSet?.name ?? '(set)'}</td>
                  <td className="py-2 pr-4">{ev.type}</td>
                  <td className="py-2 pr-4">{ev.dateType}</td>
                  <td className="py-2 pr-4">
                    {ev.dateExact ? new Date(ev.dateExact).toISOString().slice(0, 10) : ''}
                  </td>
                  <td className="py-2 pr-4">
                    {ev.dateStart ? new Date(ev.dateStart).toISOString().slice(0, 10) : ''} —{' '}
                    {ev.dateEnd ? new Date(ev.dateEnd).toISOString().slice(0, 10) : ''}
                  </td>
                  <td className="py-2 pr-4">
                    {ev.windowStart ? new Date(ev.windowStart).toISOString().slice(0, 10) : ''} —{' '}
                    {ev.windowEnd ? new Date(ev.windowEnd).toISOString().slice(0, 10) : ''}
                  </td>
                  <td className="py-2 pr-4">{ev.status}</td>
                  <td className="py-2 pr-4">{ev.sourceClaims?.length ?? 0}</td>
                </tr>
              ))}
              {inRange.length === 0 && (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={8}>
                    No events found for the given filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
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
              </tr>
            </thead>
            <tbody>
              {upcomingUndef.map((ev: any) => (
                <tr key={ev.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{ev.productSet?.name ?? '(set)'}</td>
                  <td className="py-2 pr-4">{ev.type}</td>
                  <td className="py-2 pr-4">{ev.dateType}</td>
                  <td className="py-2 pr-4">
                    {ev.windowStart ? new Date(ev.windowStart).toISOString().slice(0, 10) : ''} —{' '}
                    {ev.windowEnd ? new Date(ev.windowEnd).toISOString().slice(0, 10) : ''}
                  </td>
                  <td className="py-2 pr-4">{ev.status}</td>
                  <td className="py-2 pr-4">{ev.sourceClaims?.length ?? 0}</td>
                </tr>
              ))}
              {upcomingUndef.length === 0 && (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={6}>
                    No upcoming undefined events.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
