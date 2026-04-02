// /app/app/calendar/MonthSwitcher.tsx
"use client";

import React, { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function MonthSwitcher({
  param,
  label,
  value, // "YYYY-MM"
  canPrev = true,
  canNext = true,
}: {
  param: string;
  label?: string;
  value?: string | null;
  canPrev?: boolean;
  canNext?: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const date = useMemo(() => {
    if (value && /^\d{4}-\d{2}$/.test(value)) {
      const [y, m] = value.split("-").map((n) => parseInt(n, 10));
      return new Date(y, m - 1, 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, [value]);

  function formatYM(d: Date) {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const mm = m < 10 ? `0${m}` : `${m}`;
    return `${y}-${mm}`;
  }

  function push(d: Date) {
    const qp = new URLSearchParams(sp?.toString() ?? "");
    qp.set(param, formatYM(d));
    router.push(`/calendar?${qp.toString()}`);
  }

  function prev() {
    if (!canPrev) return;
    const d = new Date(date);
    d.setMonth(d.getMonth() - 1, 1);
    push(d);
  }
  function next() {
    if (!canNext) return;
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1, 1);
    push(d);
  }

  const monthLabel = date.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  function goToToday() {
    const now = new Date();
    push(now);
  }

  return (
    <div className="inline-flex items-center gap-2 text-sm">
      {label ? <span className="text-slate-600 font-medium">{label}</span> : null}
      <button
        type="button"
        onClick={prev}
        disabled={!canPrev}
        className={`px-2 py-1 rounded border bg-white hover:bg-gray-50 ${!canPrev ? 'opacity-40 cursor-not-allowed' : ''}`}
        aria-label="Previous month"
      >
        ◀
      </button>
      <span className="min-w-[12ch] text-center font-semibold">{monthLabel}</span>
      <button
        type="button"
        onClick={next}
        disabled={!canNext}
        className={`px-2 py-1 rounded border bg-white hover:bg-gray-50 ${!canNext ? 'opacity-40 cursor-not-allowed' : ''}`}
        aria-label="Next month"
      >
        ▶
      </button>
      <button
        type="button"
        onClick={goToToday}
        className="px-2 py-1 rounded border bg-blue-600 text-white hover:bg-blue-700"
      >
        Today
      </button>
    </div>
  );
}
