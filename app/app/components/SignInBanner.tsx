
// /app/app/components/SignInBanner.tsx
"use client";

import React from "react";

/**
 * Minimal sign-in banner with Google button.
 * Uses a normal link to NextAuth signin; no client libs required.
 */
export default function SignInBanner({
  title = "Sign in required",
  message = "Please sign in with Google to continue.",
  redirectTo, // optional path to return to after sign-in
}: {
  title?: string;
  message?: string;
  redirectTo?: string;
}) {
  const cb = redirectTo ? `?callbackUrl=${encodeURIComponent(redirectTo)}` : "";
  return (
    <div className="rounded border border-amber-300 bg-amber-50 p-4">
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-amber-800 mb-3">{message}</p>
      <a
        href={`/api/auth/signin${cb}`}
        className="inline-flex items-center gap-2 rounded bg-black text-white px-3 py-1.5 text-sm hover:bg-gray-900"
      >
        {/* Simple Google "G" glyph as text; replace with icon if desired */}
        <span className="text-lg leading-none">G</span>
        <span>Sign in with Google</span>
      </a>
    </div>
  );
}
