
// /app/app/admin/AdminTabs.tsx
"use client";

import React, { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type AdminTab = "profiles" | "users" | "system";

function getCurrentTab(sp: URLSearchParams | null): AdminTab {
  const raw = sp?.get("adminTab");
  return raw === "users" || raw === "system" ? raw : "profiles";
}

/**
 * Build a clean query string for tab changes.
 * By default, this removes transient "ok" and "msg" parameters so
 * stale banners don't persist across tab switches.
 */
function nextQueryString(
  sp: URLSearchParams | null,
  tab: AdminTab,
  opts?: { dropFeedbackParams?: boolean }
) {
  const qp = new URLSearchParams(sp ? sp.toString() : "");
  qp.set("adminTab", tab);
  if (opts?.dropFeedbackParams !== false) {
    qp.delete("ok");
    qp.delete("msg");
  }
  return qp.toString();
}

export default function AdminTabs() {
  const router = useRouter();
  const sp = useSearchParams();

  const current: AdminTab = useMemo(() => getCurrentTab(sp), [sp]);

  const pushTab = useCallback(
    (tab: AdminTab) => {
      const qs = nextQueryString(sp, tab, { dropFeedbackParams: true });
      router.push(`/admin?${qs}`, { scroll: false });
    },
    [router, sp]
  );

  // Optional: Left/Right arrow keyboard navigation
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const order: AdminTab[] = ["profiles", "users", "system"];
      const idx = order.indexOf(current);
      if (idx === -1) return;
      const nextIdx =
        e.key === "ArrowRight"
          ? (idx + 1) % order.length
          : (idx - 1 + order.length) % order.length;
      pushTab(order[nextIdx]);
    },
    [current, pushTab]
  );

  const base =
    "px-3 py-1.5 rounded-md text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brandAccent-500";
  const active = "bg-brandAccent-600 text-white border-brandAccent-600";
  const inactive = "bg-white text-gray-700 border-gray-200 hover:bg-gray-50";

  return (
    <div
      className="flex items-center gap-2"
      role="tablist"
      aria-label="Admin tabs"
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        role="tab"
        aria-selected={current === "profiles"}
        aria-current={current === "profiles" ? "page" : undefined}
        className={`${base} ${current === "profiles" ? active : inactive}`}
        onClick={() => pushTab("profiles")}
      >
        Profiles
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={current === "users"}
        aria-current={current === "users" ? "page" : undefined}
        className={`${base} ${current === "users" ? active : inactive}`}
        onClick={() => pushTab("users")}
      >
        Users
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={current === "system"}
        aria-current={current === "system" ? "page" : undefined}
        className={`${base} ${current === "system" ? active : inactive}`}
        onClick={() => pushTab("system")}
      >
        System
      </button>
    </div>
  );
}
