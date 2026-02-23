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

  const components = useMemo(
    () => ({
      // minimal styling; can customize more later
    }),
    [],
  );

  // Typed event style getter

  const eventStyleGetter = (
    event: CalendarEvent,
    _start?: Date,
    _end?: Date,
    _isSelected?: boolean,
  ) => {
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
      },
    } as const;
  };

  return (
    <div className="rounded border p-3 bg-blue-100">
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
        style={{ height: 650 }}
        eventPropGetter={eventStyleGetter}
      />
    </div>
  );
}
