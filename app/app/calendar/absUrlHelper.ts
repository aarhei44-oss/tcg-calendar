// /app/app/calendar/absUrlHelper.ts
import { headers } from "next/headers";

export async function absUrl(path: string) {
  const hs = await headers();
  const host = hs.get("x-forwarded-host") ?? hs.get("host") ?? "localhost:3000";
  const proto =
    hs.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}${path}`;
}
