import type { NextApiRequest, NextApiResponse } from "next";
import { getUserSubscriptions, setUserSubscription } from "data/admin/adminRepo";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const userId = (req.cookies as any)?.userId as string | undefined;
  if (!userId)
    return res.status(401).json({ ok: false, error: "Not signed in" });

  if (req.method === "GET") {
    const subs = await getUserSubscriptions(userId);
    return res.status(200).json({ ok: true, subscriptions: subs });
  }

  if (req.method === "POST") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const installId = String(body?.installId ?? "");
    const subscribe = body?.subscribe === true || body?.subscribe === "true";
    if (!installId)
      return res.status(400).json({ ok: false, error: "installId required" });

    await setUserSubscription(userId, installId, subscribe);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
