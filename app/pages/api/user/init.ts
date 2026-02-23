// /app/pages/api/user/init.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getOrCreateUserByEmail } from "app/data/prismaRepo";

function buildUserIdSetCookie(userId: string) {
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `userId=${encodeURIComponent(userId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (isProd) parts.push("Secure");
  return parts.join("; ");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const email = String(body?.email ?? "").trim();
    const name = String(body?.name ?? "").trim();

    if (!email)
      return res.status(400).json({ ok: false, error: "email required" });
    if (!name)
      return res.status(400).json({ ok: false, error: "name required" });

    const user = await getOrCreateUserByEmail(email, name);

    res.setHeader("Set-Cookie", buildUserIdSetCookie(user.id));
    return res
      .status(200)
      .json({ ok: true, userId: user.id, name: user.name, email: user.email });
  } catch (err: any) {
    return res
      .status(500)
      .json({ ok: false, error: err?.message ?? "Unexpected error" });
  }
}
