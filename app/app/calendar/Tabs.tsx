// /app/app/calendar/Tabs.tsx
"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";

type TabKey = "calendar" | "list" | "upcoming";

export default function Tabs() {
  const router = useRouter();
  const sp = useSearchParams(); // may be typed as possibly null in your env

  const current = (sp?.get("tab") as TabKey) ?? "calendar";

  function pushTab(tab: TabKey) {
    const qp = new URLSearchParams(sp ? sp.toString() : "");
    qp.set("tab", tab);
    router.push(`/calendar?${qp.toString()}`);
  }

  const base =
    "flex-1 text-center px-[calc(1rem+5px)] py-2 rounded-lg text-sm font-semibold border shadow-sm min-w-[8rem] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brandAccent-400";
  const active =
    "bg-brandAccent-600 text-white border-brandAccent-600 shadow-lg";
  const inactive =
    "bg-white text-gray-800 border-gray-300 hover:bg-brandAccent-50 hover:text-brandAccent-700";

  return (
    <div className="flex items-stretch gap-[2px]" role="tablist" aria-label="Calendar views">
      <button
        type="button"
        role="tab"
        aria-selected={current === "calendar"}
        className={`${base} ${current === "calendar" ? active : inactive}`}
        onClick={() => pushTab("calendar")}
      >
        Calendar
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={current === "list"}
        className={`${base} ${current === "list" ? active : inactive}`}
        onClick={() => pushTab("list")}
      >
        Events List
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={current === "upcoming"}
        className={`${base} ${current === "upcoming" ? active : inactive}`}
        onClick={() => pushTab("upcoming")}
      >
        Upcoming
      </button>
    </div>
  );
}
