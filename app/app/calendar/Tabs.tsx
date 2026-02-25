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
    "px-3 py-1.5 rounded-md text-sm font-medium border transition-colors";
  const active = "bg-brandAccent-600 text-white border-brandAccent-600";
  const inactive = "bg-white text-gray-700 border-gray-200 hover:bg-gray-50";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={`${base} ${current === "calendar" ? active : inactive}`}
        onClick={() => pushTab("calendar")}
      >
        Calendar
      </button>
      <button
        type="button"
        className={`${base} ${current === "list" ? active : inactive}`}
        onClick={() => pushTab("list")}
      >
        Events List
      </button>
      <button
        type="button"
        className={`${base} ${current === "upcoming" ? active : inactive}`}
        onClick={() => pushTab("upcoming")}
      >
        Upcoming
      </button>
    </div>
  );
}
