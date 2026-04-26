
// /app/app/calendar/EventDrawer.tsx

import React from 'react';
import Link from 'next/link';
import { getEventDetails } from '../../data/calendar/calendarRepo';
import { TypeBadge, StatusBadge } from '../../app/ui/Badges';
import CommentsForEvent from './CommentsForEvent';
import { fmtDate } from '../lib/utils';

// Build a URL without "event" while preserving other query params
function buildCloseHref(sp: Record<string, string | string[]>) {
  const qp = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === 'event') continue;
    if (Array.isArray(v)) v.forEach(x => qp.append(k, x));
    else if (v) qp.append(k, v);
  }
  const qs = qp.toString();
  return qs ? `/calendar?${qs}` : `/calendar`;
}

export default async function EventDrawer({
  eventId,
  sp,
}: {
  eventId?: string | null;
  sp: Record<string, string | string[]>;
}) {
  if (!eventId) return null;

  const ev = await getReleaseEventWithSources(eventId);
  if (!ev) {
    return (
      <div className="fixed inset-0 z-40">
        <Link href={buildCloseHref(sp)} className="absolute inset-0 bg-black/30" />
        <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl p-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-lg font-semibold">Event not found</h3>
            <Link href={buildCloseHref(sp)} className="text-sm text-blue-600 hover:underline">Close</Link>
          </div>
          <p className="mt-3 text-sm text-gray-600">The event you tried to open does not exist.</p>
        </div>
      </div>
    );
  }

  const closeHref = buildCloseHref(sp);

  return (
    <div className="fixed inset-0 z-40">
      {/* overlay click closes */}
      <Link href={closeHref} className="absolute inset-0 bg-black/30" />

      {/* drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-lg font-semibold">{ev.productSet?.name ?? '(set)'}</h3>
          <Link href={closeHref} className="text-sm text-blue-600 hover:underline">Close</Link>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Core fields */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-500">Type:</span>{' '}
              <TypeBadge variant={ev.type ?? 'n/a'} />
            </div>
            <div>
              <span className="text-slate-500">Status:</span>{' '}
              <StatusBadge variant={ev.status ?? 'n/a'} />
            </div>
            <div><span className="text-slate-500">Date Type:</span> <span className="font-medium">{ev.dateType}</span></div>

            {ev.dateType === 'EXACT' && (
              <div className="col-span-2"><span className="text-gray-500">Date:</span> <span className="font-medium">{fmtDate(ev.dateExact)}</span></div>
            )}
            {ev.dateType === 'RANGE' && (
              <div className="col-span-2"><span className="text-gray-500">Range:</span> <span className="font-medium">{fmtDate(ev.dateStart)} — {fmtDate(ev.dateEnd)}</span></div>
            )}
            {ev.dateType === 'WINDOW' && (
              <div className="col-span-2"><span className="text-gray-500">Window:</span> <span className="font-medium">{fmtDate(ev.windowStart)} — {fmtDate(ev.windowEnd)}</span></div>
            )}
            {ev.dateType === 'TBD' && (
              <div className="col-span-2"><span className="text-gray-500">Date:</span> <span className="font-medium">TBD</span></div>
            )}

            <div><span className="text-gray-500">Region:</span> <span className="font-medium">{ev.region}</span></div>
            <div><span className="text-gray-500">Confidence:</span> <span className="font-medium">{ev.confidence}</span></div>
          </div>

          {/* SourceClaims snapshot */}
          <div>
            <h4 className="font-semibold text-sm mb-2">Sources</h4>
            {ev.sourceClaims.length === 0 ? (
              <p className="text-xs text-gray-500">No sources recorded.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {ev.sourceClaims.map((sc: any) => (
                  <li key={sc.id} className="border rounded p-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{sc.tier} <span className="text-gray-500">/ {sc.disposition}</span></div>
                      <div className="text-xs text-gray-500">conf {sc.confidenceWeight}</div>
                    </div>
                    <div className="text-xs text-blue-700 truncate">
                      {sc.url ? <a className="hover:underline" href={sc.url} target="_blank">{sc.url}</a> : sc.host ?? '(no url)'}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {sc.dateType === 'EXACT' && `Exact: ${fmtDate(sc.dateExact)}`}
                      {sc.dateType === 'RANGE' && `Range: ${fmtDate(sc.dateStart)} — ${fmtDate(sc.dateEnd)}`}
                      {sc.dateType === 'WINDOW' && `Window: ${fmtDate(sc.windowStart)} — ${fmtDate(sc.windowEnd)}`}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Comments for this event (current user only) */}
          <div>
            <h4 className="font-semibold text-sm mb-2">Your comments</h4>
            <CommentsForEvent eventId={ev.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
