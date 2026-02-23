// /app/app/subscriptions/page.tsx
import React from "react";
import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import SiteShell from "../components/SiteShell";
import { prisma } from "app/lib/prisma";
import { getUserSubscriptions, setUserSubscription } from "../data/prismaRepo";
import { listEventsByDateRangeAndFilters } from "app/data/prismaRepo";

export const dynamic = "force-dynamic";

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function fmtDate(d?: string | Date | null): string {
  if (!d) return "";
  const iso = typeof d === "string" ? d : d.toISOString();
  return new Date(iso).toISOString().slice(0, 10);
}

// ---- Server Action: toggle subscription ----
export async function toggleSubscription(formData: FormData) {
  "use server";

  const hs = await headers();
  const cookie = hs.get("cookie") ?? "";
  const userIdMatch = /(?:^|;\s*)userId=([^;]+)/.exec(cookie);
  const userId = userIdMatch?.[1] ?? null;
  if (!userId) {
    redirect("/subscriptions?ok=0&msg=not%20signed%20in");
  }

  const installId = String(formData.get("installId") ?? "");
  const subscribe = String(formData.get("subscribe") ?? "") === "true";
  if (!installId) {
    redirect("/subscriptions?ok=0&msg=missing%20installId");
  }

  await setUserSubscription(userId!, installId, subscribe);
  revalidatePath("/subscriptions");
  redirect("/subscriptions?ok=1");
}

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const sp = (searchParams ? await searchParams : undefined) ?? {};
  const ok = Array.isArray(sp.ok) ? sp.ok[0] : sp.ok;
  const msg = Array.isArray(sp.msg) ? sp.msg[0] : sp.msg;

  const store = await cookies();
  const userId = store.get("userId")?.value ?? null;

  // No identity yet → prompt Name+Email
  if (!userId) {
    return (
      <SiteShell current="subscriptions" title="Subscriptions">
        {ok && (
          <div
            className={`rounded border px-3 py-2 text-sm ${ok === "1" ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"}`}
          >
            {ok === "1" ? "Success" : "Action failed"}
            {msg ? ` — ${decodeURIComponent(msg as string)}` : ""}
          </div>
        )}

        <section className="rounded-card border shadow-card bg-white p-4 space-y-3">
          <h2 className="text-lg font-semibold">Set your name</h2>
          <form
            action="/api/user/init"
            method="post"
            className="grid gap-2 sm:grid-cols-2"
          >
            <label className="text-sm">
              <span className="block">Name</span>
              <input
                className="border rounded px-2 py-1 w-full"
                name="name"
                type="text"
                placeholder="Your name"
                required
              />
            </label>
            <label className="text-sm">
              <span className="block">Email</span>
              <input
                className="border rounded px-2 py-1 w-full"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="text-xs px-3 py-1 rounded bg-brandAccent-600 text-white hover:bg-brandAccent-700"
              >
                Save
              </button>
            </div>
          </form>
          <p className="text-xs text-gray-600">
            We’ll set a secure cookie to remember you on this device.
          </p>
        </section>
      </SiteShell>
    );
  }

  // Load enabled installs + current subscriptions
  const [installs, subs] = await Promise.all([
    prisma.tcgProfileInstall.findMany({
      where: { enabled: true },
      select: { id: true, packageId: true, enabled: true },
      orderBy: { packageId: "asc" },
    }),
    getUserSubscriptions(userId),
  ]);
  const subscribed = new Set<string>(subs);

  return (
    <SiteShell current="subscriptions" title="Subscriptions">
      {ok && (
        <div
          className={`rounded border px-3 py-2 text-sm ${ok === "1" ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"}`}
        >
          {ok === "1" ? "Success" : "Action failed"}
          {msg ? ` — ${decodeURIComponent(msg as string)}` : ""}
        </div>
      )}

      <section className="rounded-card border shadow-card bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Your Subscriptions</h2>
          <div className="text-sm text-storm-600">
            {subscribed.size} selected
          </div>
        </div>

        <div className="divide-y">
          {installs.length === 0 && (
            <div className="py-4 text-sm text-gray-500">
              No enabled installs are available.
            </div>
          )}
          {installs.map((i) => {
            const isSub = subscribed.has(i.id);
            return (
              <div
                key={i.id}
                className="py-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{i.packageId}</div>
                  <div className="text-xs text-gray-500">
                    install {i.id.slice(0, 8)}…
                  </div>
                </div>
                <form
                  action={toggleSubscription}
                  className="inline-flex items-center gap-2"
                >
                  <input type="hidden" name="installId" value={i.id} />
                  <input
                    type="hidden"
                    name="subscribe"
                    value={(!isSub).toString()}
                  />
                  <button
                    type="submit"
                    className={`text-xs px-3 py-1 rounded border ${
                      isSub
                        ? "bg-green-50 border-green-200 text-green-800 hover:bg-green-100"
                        : "bg-white hover:bg-gray-50"
                    }`}
                    title={isSub ? "Unsubscribe" : "Subscribe"}
                  >
                    {isSub ? "Unsubscribe" : "Subscribe"}
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      </section>
    </SiteShell>
  );
}
