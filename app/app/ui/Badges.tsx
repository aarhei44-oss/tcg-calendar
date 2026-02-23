// /app/app/ui/Badges.tsx
import React from "react";

export function TypeBadge({ variant }: { variant?: string }) {
  const v = (variant ?? "").toLowerCase();
  const cls =
    v === "shelf"
      ? "bg-violet-100 text-violet-800 border-violet-200"
      : v === "prerelease"
        ? "bg-blue-100 text-blue-800 border-blue-200"
        : v === "promo"
          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
          : v === "special"
            ? "bg-amber-100 text-amber-800 border-amber-200"
            : "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${cls}`}
    >
      {variant ?? "type"}
    </span>
  );
}

export function StatusBadge({ variant }: { variant?: string }) {
  const v = (variant ?? "").toLowerCase();
  const cls =
    v === "confirmed"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : v === "announced"
        ? "bg-blue-100 text-blue-800 border-blue-200"
        : v === "delayed"
          ? "bg-amber-100 text-amber-800 border-amber-200"
          : v === "canceled"
            ? "bg-rose-100 text-rose-800 border-rose-200"
            : v === "rumor"
              ? "bg-gray-100 text-gray-700 border-gray-200"
              : "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${cls}`}
    >
      {variant ?? "status"}
    </span>
  );
}
