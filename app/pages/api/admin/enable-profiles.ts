// /app/pages/api/admin/enable-profiles.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { enableProfilesAndSeedData } from "../../../app/data/prismaRepo";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Fast path: only allow GET and POST
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      info: "POST this endpoint with { installs: string[], options?: { seed?: boolean } }",
    });
  }

  // POST
  try {
    const raw = req.body;
    let body: any = raw;

    // Support both parsed JSON and raw string
    if (typeof raw === "string") {
      try {
        body = JSON.parse(raw);
      } catch {
        return res.status(400).json({ ok: false, error: "Invalid JSON body" });
      }
    }

    const installs: string[] = Array.isArray(body?.installs)
      ? body.installs
      : [];
    if (!installs.length) {
      return res.status(400).json({ ok: false, error: "installs[] required" });
    }

    const options = body?.options ?? {};

    await enableProfilesAndSeedData(installs, options);
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res
      .status(500)
      .json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
