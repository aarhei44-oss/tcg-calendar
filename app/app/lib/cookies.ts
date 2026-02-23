// /app/app/lib/cookies.ts
import { cookies } from "next/headers";

const COOKIE_NAME = "userId";

/**
 * Reads the `userId` cookie from the current request context.
 * Works in Server Components, Server Actions, and Route Handlers.
 */
export async function getUserIdFromCookie(): Promise<string | null> {
  try {
    const store = await cookies(); // Await because cookies() returns a Promise in your setup
    const c = store.get(COOKIE_NAME);
    return c?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Sets the `userId` cookie for subsequent responses.
 * Only works in Server Actions or Route Handlers that can mutate headers.
 * (For Pages API, prefer using `res.setHeader('Set-Cookie', ...)`.)
 */
export async function setUserIdCookie(userId: string): Promise<void> {
  const store = await cookies(); // Await the cookie store
  const isProd = process.env.NODE_ENV === "production";
  store.set({
    name: COOKIE_NAME,
    value: userId,
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
  });
}
