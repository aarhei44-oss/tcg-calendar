// /app/app/components/SiteShell.tsx
import React from "react";
import Link from "next/link";
import { getSession } from "app/auth"; // adjust if your path differs
import { isAdminByPrefs } from "app/data/prismaRepo";


export default async function SiteShell({
  children,
  current,
  title = "Release Calendar",
}: {
  children: React.ReactNode;
  current?: "calendar" | "subscriptions" | "admin";
  title?: string;
}) {
  

  const session = await getSession();
  const userId = session?.user?.id;
  const isAdmin = userId ? await isAdminByPrefs(userId) : false;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="md:flex">
        <aside className="w-full md:w-64 bg-slate-900 text-white border-b md:border-b-0 md:border-r border-slate-200">
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800">
            <div className="text-lg font-bold tracking-wide">Release Watcher</div>
            <span className="hidden md:inline text-[11px] bg-slate-700 px-2 py-1 rounded">v0.1</span>
          </div>

          <nav className="px-3 py-4 space-y-1">
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
            {isAdmin && (
              <NavItem href="/admin" label="Admin" active={current === "admin"} />
            )}
          </nav>

          <div className="mt-auto px-4 py-4 text-xs text-slate-300">
            <p>Fast release tracking • mobile ready</p>
            {userId ? (
              <p className="mt-1">Signed in</p>
            ) : (
              <p className="mt-1">Guest mode</p>
            )}
          </div>
        </aside>

        <main className="flex-1">
          <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 shadow-sm md:shadow-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-xl font-semibold">{title}</h1>
              <div className="text-sm text-slate-600">{current?.toUpperCase() || "Calendar"}</div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[calc(100vw-2rem)] px-3 py-4">{children}</div>
        </main>
      </div>
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
        "block rounded-lg px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-slate-700 text-white shadow-inner"
          : "text-slate-300 hover:bg-slate-800 hover:text-white",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}
