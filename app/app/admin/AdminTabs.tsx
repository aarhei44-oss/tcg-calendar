// /app/app/admin/AdminTabs.tsx
"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";

type AdminTab = "profiles" | "users" | "system";

export default function AdminTabs() {
  const router = useRouter();
  const sp = useSearchParams();
  const current: AdminTab = (sp?.get("adminTab") as AdminTab) ?? "profiles";

  function pushTab(tab: AdminTab) {
    const qp = new URLSearchParams(sp ? sp.toString() : "");
    qp.set("adminTab", tab);
    router.push(`/admin?${qp.toString()}`);
  }

  const base =
    "px-3 py-1.5 rounded-md text-sm font-medium border transition-colors";
  const active = "bg-brandAccent-600 text-white border-brandAccent-600";
  const inactive = "bg-white text-gray-700 border-gray-200 hover:bg-gray-50";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={`${base} ${current === "profiles" ? active : inactive}`}
        onClick={() => pushTab("profiles")}
      >
        Profiles
      </button>
      <button
        type="button"
        className={`${base} ${current === "users" ? active : inactive}`}
        onClick={() => pushTab("users")}
      >
        Users
      </button>
      <button
        type="button"
        className={`${base} ${current === "system" ? active : inactive}`}
        onClick={() => pushTab("system")}
      >
        System
      </button>
    </div>
  );
}
