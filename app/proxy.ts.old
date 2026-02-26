
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = new URL("/api/auth/signin", req.url);
    return NextResponse.redirect(url);
  }

  // You don't have isAdmin on the JWT by default (you're using session: 'database').
  // You can either embed it at sign-in, or skip middleware admin check and rely on server checks.
  // For MVP: skip admin enforcement here; rely on server guard from step #2.
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
