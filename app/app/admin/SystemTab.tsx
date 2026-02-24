
import { auth } from "app/auth";
import { isAdminByPrefs } from "app/data/prismaRepo";
import DbCrudClient from "./db/DbCrudClient";

export default async function SystemTab() {
  const session = await auth();
  const userId = session?.user?.id;
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
    </div>
  );
}
