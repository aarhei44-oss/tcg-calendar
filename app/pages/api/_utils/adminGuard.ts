
// /app/pages/api/_utils/adminGuard.ts
import type { NextApiRequest, NextApiResponse } from "next";
import  getServerSession  from "next-auth";
import { authOptions } from "app/auth"; // your single source options
import { isAdminByPrefs } from "app/data/prismaRepo"; // or "@/app/auth" if exported there

export async function requireAdmin(req: NextApiRequest, res: NextApiResponse): Promise<{ userId: string }> {
  const session = await getServerSession(req, res, authOptions as any);console.log("authOptions type:", typeof authOptions, "keys:", Object.keys(authOptions || {}));
  const userId = session?.user?.id as string | undefined;
  if (!userId) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    throw new Error("Unauthorized");
  }
  const admin = await isAdminByPrefs(userId);
  if (!admin) {
    res.status(403).json({ ok: false, error: "Forbidden" });
    throw new Error("Forbidden");
  }
  return { userId };
}
