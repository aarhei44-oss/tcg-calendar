
import { getSession } from "../../app/auth";
import { isAdminByPrefs } from "../../data/admin/adminRepo";
import DbCrudClient from "./db/DbCrudClient";
import { dedupeReleaseEventsAction } from "./db/actions";

export default async function SystemTab() {
  const session = await getSession();
  const userId = session?.user?.id;
  console.log("Systemtab.tsx - " + session?.user.name + ': '+ session?.user.email );
  const isAdmin = userId ? await isAdminByPrefs(userId) : false;

  if (!isAdmin) {
    return <p className="text-sm text-red-600">Not authorized.</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">System Tools</h2>
      <div className="rounded border p-4">
        <h3 className="font-semibold mb-2">DB Tools (whitelisted models)</h3>
        <DbCrudClient />
      </div>

      <div className="rounded border p-4">
        <h3 className="font-semibold mb-2">Release Event Deduplication</h3>
        <p className="text-sm text-gray-600 mb-3">
          Remove duplicated entries in `ReleaseEvent` based on the same key fields.
        </p>
        <form action={dedupeReleaseEventsAction} method="post">
          <button
            type="submit"
            className="px-3 py-2 rounded bg-orange-600 text-white hover:bg-orange-700"
          >
            Remove duplicate release events
          </button>
        </form>
      </div>
    </div>
  );
}
