// /app/pages/api/admin/installs.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../app/lib/prisma";
import { requireAdmin } from "../_utils/adminGuard";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {

  await requireAdmin(req, res);

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const rows = await prisma.tcgProfileInstall.findMany({
      select: { id: true, enabled: true, packageId: true },
      orderBy: { id: "asc" },
    });
    return res.status(200).json({ ok: true, installs: rows });
  } catch (err: any) {
    return res
      .status(500)
      .json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
