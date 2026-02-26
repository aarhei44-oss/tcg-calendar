
// /app/pages/api/admin/enable-profiles.ts
import type { NextApiRequest, NextApiResponse } from "next";

// NOTE: correct relative path: pages/api/admin → app/prisma/seed
import {
  enableProfilesAndSeedData,
  upsertPackagesAndInstalls,
} from "../../../prisma/seed";
import { requireAdmin } from "../_utils/adminGuard";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {

  await requireAdmin(req, res);

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      info:
        "POST with { installs: string[] | {id:string;slug?:string}[], options?: { seed?: number, fresh?: boolean } }. If installs omitted, seeds ALL installs.",
    });
  }

  try {
    // 1) Always ensure packages & installs exist first (idempotent)
    const allInstalls = await upsertPackagesAndInstalls(); // returns [{id, packageId, slug},...]

    // 2) Parse body (accepts JSON or raw string). If invalid, treat as empty.
    let body: any = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    // 3) Pull options and supports fresh via query too
    const options = body?.options ?? {};
    const seedOpt: number | undefined = options.seed;
    const freshFromBody: boolean = !!options.fresh;
    const freshFromQuery =
      req.query.fresh === "1" || req.query.fresh === "true";
    const fresh = freshFromBody || !!freshFromQuery;

    // 4) Determine which installs to seed
    // If no installs provided, default to **all** that exist
    let installsInput = Array.isArray(body?.installs) ? body.installs : [];
    if (installsInput.length === 0) {
      installsInput = allInstalls.map((c) => ({ id: c.id, slug: c.slug }));
    }

    // Normalize to { id, slug? }[]
    const installs: { id: string; packageId:string; slug: string }[] = installsInput.map(
      (it: any) => {
        if (typeof it === "string") return { id: it };
        if (it && typeof it.id === "string") return { id: it.id, slug: it.slug };
        throw new Error("Invalid install item; expected string or { id, slug? }");
      },
    );

    // 5) Seed content for those installs
    await enableProfilesAndSeedData({
      installs,
      seed: seedOpt,
      fresh,
    });

    return res.status(200).json({
      ok: true,
      count: installs.length,
      fresh,
      seed: seedOpt ?? null,
    });
  } catch (err: any) {
    return res
      .status(500)
      .json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
