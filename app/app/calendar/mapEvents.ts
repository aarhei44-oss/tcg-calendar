// /app/app/calendar/mapEvents.ts
import type { Event as RBCEvent } from "react-big-calendar";

export type ReleaseEventLike = {
  id: string;
  type: string;
  dateType: "EXACT" | "RANGE" | "WINDOW" | "TBD";
  dateExact?: string | null;
  dateStart?: string | null;
  dateEnd?: string | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  status: string;
  productSet?: { name?: string | null } | null;
};

export type CalendarEvent = RBCEvent & {
  id: string;
  type?: string;
  dateType?: string;
  status?: string;
  productSetName?: string | null;
};

function toDate(d?: string | null): Date | null {
  if (!d) return null;
  const x = new Date(d);
  return isNaN(x.getTime()) ? null : x;
}

export function mapReleaseEventsToCalendar(
  events: ReleaseEventLike[],
): CalendarEvent[] {
  const out: CalendarEvent[] = [];

  for (const ev of events) {
    const base = {
      id: ev.id,
      type: ev.type,
      dateType: ev.dateType,
      status: ev.status,
      productSetName: ev.productSet?.name ?? null,
      allDay: true,
    };

    if (ev.dateType === "EXACT") {
      const exact = toDate(ev.dateExact);
      if (!exact) continue;
      const end = new Date(exact);
      end.setHours(23, 59, 59, 999);
      out.push({
        ...base,
        start: exact,
        end,
        title: base.productSetName ?? "(set)",
      });
      continue;
    }

    if (ev.dateType === "RANGE") {
      const s = toDate(ev.dateStart);
      const e = toDate(ev.dateEnd);
      if (!s || !e) continue;
      const end = new Date(e);
      end.setHours(23, 59, 59, 999);
      out.push({
        ...base,
        start: s,
        end,
        title: base.productSetName ?? "(set)",
      });
      continue;
    }

    if (ev.dateType === "WINDOW") {
      const s = toDate(ev.windowStart);
      const e = toDate(ev.windowEnd);
      if (!s || !e) continue;
      const end = new Date(e);
      end.setHours(23, 59, 59, 999);
      out.push({
        ...base,
        start: s,
        end,
        title: base.productSetName ?? "(set)",
      });
      continue;
    }

    // TBD → skip calendar
  }

  return out;
}
