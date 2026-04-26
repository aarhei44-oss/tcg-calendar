
// /app/pages/api/_utils/adminGuard.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../app/auth";
import { isAdminByPrefs } from "../../../data/admin/adminRepo";

/**
 * Helper to enforce admin for Pages API routes.
 * Returns the userId if admin, otherwise responds with 401/403 and returns null.
 */
export default async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<string | null> {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const isAdmin = await isAdminByPrefs(session.user.id);
  if (!isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }

  return session.user.id;
}

/**
 * (Optional) Bypass for container entrypoint seeding via internal header.
 * Only use if you explicitly enable an internal bypass.
 */
export function isBypassAdmin(req: NextApiRequest): boolean {
  const header = req.headers["x-admin-bypass"];
  return typeof header === "string" && header === process.env.ADMIN_BYPASS_TOKEN;
}
