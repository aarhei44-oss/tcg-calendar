// /app/app/calendar/ClientCalendar.tsx
"use client";

import React, { useMemo, useCallback, useState } from "react";
import { Calendar, Views, type Event as RBCEvent } from "react-big-calendar";
import { dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, isValid } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import "react-big-calendar/lib/css/react-big-calendar.css";

// Minimal date-fns localizer (US)
const locales = {};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

export type CalendarEvent = RBCEvent & {
  id: string;
  type?: string;
  dateType?: string;
  status?: string;
  productSetName?: string | null;
};

function buildNextYm(date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${y}-${mm}`;
}

export default function ClientCalendar({
  events,
  defaultDate,
  titleAccessor = (e: CalendarEvent) =>
    `${e.productSetName ?? "(set)"}${e.type ? " — " + e.type : ""}${e.status ? " [" + e.status + "]" : ""}`,
}: {
  events: CalendarEvent[];
  defaultDate: Date;
  titleAccessor?: (e: CalendarEvent) => string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const isCompact = (sp?.get("mode") ?? "") === "compact";

  function pushWithEvent(id: string) {
    const qp = new URLSearchParams(sp?.toString() ?? "");
    qp.set("event", id);
    // keep existing filters/ym/tab intact
    router.push(`/calendar?${qp.toString()}`);
  }

  // Preserve existing filter search params when navigating months
  const keepFilters = useCallback(
    (ym: string) => {
      const params = new URLSearchParams(sp?.toString() ?? "");
      params.set("ym", ym);
      return `/calendar?${params.toString()}`;
    },
    [sp],
  );

  const [date, setDate] = useState<Date>(defaultDate);
  const onNavigate = useCallback(
    (newDate: Date) => {
      // Update view immediately so the calendar UI changes right away
      setDate(newDate);

      // Keep server-driven lazy-load by updating the URL (preserve filters)
      const ym = buildNextYm(newDate);
      router.push(keepFilters(ym));
    },
    [router, keepFilters],
  );

  const CompactEvent = ({ event }: { event: CalendarEvent }) => (
    <div className="overflow-hidden text-[10px] leading-tight" title={`${event.productSetName ?? "(set)"}${event.type ? " — " + event.type : ""}`}>
      {event.productSetName ?? "(set)"}
      {event.type ? ` · ${event.type}` : ""}
    </div>
  );

  const components = useMemo(
    () => ({
      event: isCompact ? CompactEvent : undefined,
    }),
    [isCompact],
  );

  // Typed event style getter

  const eventStyleGetter = (
    event: CalendarEvent,
    _start?: Date,
    _end?: Date,
    _isSelected?: boolean,
  ) => {
    const baseStyle = isCompact
      ? { fontSize: "11px", padding: "1px 2px", lineHeight: "1.1", borderRadius: "3px" }
      : { fontSize: "12px", padding: "2px 4px", lineHeight: "1.2", borderRadius: "4px" };
    const type = (event?.type ?? "").toLowerCase();
    const bg =
      type === "shelf"
        ? "#7c3aed"
        : type === "prerelease"
          ? "#2563eb"
          : type === "promo"
            ? "#059669"
            : type === "special"
              ? "#d97706"
              : "#4b5563";

    return {
      style: {
        backgroundColor: bg,
        borderColor: bg,
        color: "#ffffff",
        ...baseStyle,
      },
    } as const;
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="text-sm text-slate-600">Click an event to view details</div>
        <div className="text-xs text-slate-400">{events.length} events shown</div>
        <div>
          <a
            href={isCompact ? "/calendar" : "/calendar?mode=compact"}
            className="text-xs text-blue-600 hover:underline"
          >
            {isCompact ? "Normal mode" : "Compact mode"}
          </a>
        </div>
      </div>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        titleAccessor={titleAccessor}
        defaultView={Views.MONTH}
        views={[Views.MONTH]}
        step={60}
        popup
        onNavigate={onNavigate}
        date={date}
        defaultDate={undefined}
        components={components}
        style={{ height: isCompact ? 620 : 760 }}
        eventPropGetter={eventStyleGetter}
        dayPropGetter={() => ({ style: { minHeight: isCompact ? 58 : 80 } })}
        onSelectEvent={(evt: any) => {
          if (evt?.id) pushWithEvent(String(evt.id));
        }}
      />
    </div>
  );
}
