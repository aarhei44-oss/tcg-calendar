import { headers } from "next/headers";
import { absUrl } from "../lib/utils";

/** Installed Profiles (enabled only) with subscribe/unsubscribe buttons. */
export default async function InstalledProfilesList({ signedIn }: { signedIn: boolean }) {
  const hs = await headers();
  const cookie = hs.get("cookie") ?? "";

  const [installsRes, subsRes] = await Promise.all([
    fetch(await absUrl("/api/admin/installs"), {
      cache: "no-store",
      headers: { cookie },
    }),
    fetch(await absUrl("/api/user/subscriptions"), {
      cache: "no-store",
      headers: { cookie },
    }),
  ]);

  const installs = installsRes.ok ? await installsRes.json() : [];
  let subs: string[] = [];
  try {
    const subsJson = await subsRes.json();
    if (
      subsRes.ok &&
      subsJson &&
      Array.isArray((subsJson as any).subscriptions)
    ) {
      subs = (subsJson as any).subscriptions;
    }
  } catch {
    subs = [];
  }
  const enabledInstalls = (Array.isArray(installs) ? installs : []).filter(
    (i: any) => i?.enabled === true,
  );

  return (
    <ul className="divide-y">
      {enabledInstalls.map((i) => {
        const subscribed = subs.includes(i.id);
        return (
          <li key={i.id} className="py-2 flex items-center justify-between">
            <div>
              <div className="font-medium">{i.packageId}</div>
              <div className="text-xs text-gray-500">
                install {i.id.slice(0, 8)}…
              </div>
            </div>

            {signedIn ? (
              <form action={subscribeAction}>
                <input type="hidden" name="installId" value={i.id} />
                <input
                  type="hidden"
                  name="subscribe"
                  value={(!subscribed).toString()}
                />
                <button
                  type="submit"
                  className={`px-2 py-1 rounded border text-xs ${
                    subscribed ? "bg-green-50" : "bg-white"
                  }`}
                  title={subscribed ? "Unsubscribe" : "Subscribe"}
                >
                  {subscribed ? "Unsubscribe" : "Subscribe"}
                </button>
              </form>
            ) : (
              <span className="text-xs text-gray-500">
                Sign in to subscribe
              </span>
            )}
          </li>
        );
      })}
      {enabledInstalls.length === 0 && (
        <li className="py-2 text-sm text-gray-500">No enabled installs.</li>
      )}
    </ul>
  );
}
