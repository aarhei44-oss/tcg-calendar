// /app/app/components/SiteShell.tsx
import React from "react";
import Link from "next/link";

export default function SiteShell({
  children,
  current,
  title = "Release Calendar",
}: {
  children: React.ReactNode;
  current?: "calendar" | "subscriptions" | "admin";
  title?: string;
}) {
  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr] grid-rows-[56px_1fr]">
      {/* Left nav */}
      <aside className="row-span-2 bg-midnight-950 border border-gray-300  ">
        <div className="px-4 text-gray-900 py-4 text-lg font-bold tracking-wide">
          Release Watcher
        </div>
        <nav className="px-2">
          <NavItem
            href="/calendar"
            label="Calendar"
            active={current === "calendar"}
          />
          <NavItem
            href="/subscriptions"
            label="Subscriptions"
            active={current === "subscriptions"}
          />
          <NavItem href="/admin" label="Admin" active={current === "admin"} />
        </nav>
        <div className="mt-auto px-4 py-4 text-xs text-gray-900">
          <p>v0.1 • auto theme</p>
        </div>
      </aside>

      {/* Narrow header */}
      <header className="col-start-2 border-b border-gray-300 flex items-center justify-between px-4">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="text-sm text-storm-600">
          {/* room for breadcrumb / month label / user chip */}
        </div>
      </header>

      {/* Content panel (80% width) */}
      <main className="col-start-2 bg-blue-50">
        <div className="w-[80%] mx-auto py-6 space-y-8">{children}</div>
      </main>
    </div>
  );
}

function NavItem({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "block rounded-md px-3 py-2 my-1 text-sm font-medium",
        active
          ? "bg-white text-blue-950 shadow-sm"
          : "text-gray-600 hover:bg-brandAccent-600/20 hover:text-white",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}
