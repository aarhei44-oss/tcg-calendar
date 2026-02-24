
// /app/app/auth.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "app/lib/prisma";

// Parse ADMIN_EMAILS once
const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// NOTE: Do NOT add `trustHost` here. Auth.js reads AUTH_TRUST_HOST=true from env.
// Keep NEXTAUTH_URL, NEXTAUTH_SECRET, GOOGLE_* in .env.local for dev.
// Keep DATABASE_URL in app.env for Prisma.

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Dev only: helps avoid OAuthAccountNotLinked during local testing
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],

  events: {
    async signIn({ user }) {
      // Sync preferences.isAdmin from ADMIN_EMAILS after successful sign-in
      try {
        const email = (user?.email ?? "").toLowerCase();
        if (!email) return;

        const isAdmin = adminEmails.includes(email);

        // Merge into JSON preferences without dropping other keys (if present)
        const currentPrefs =
          typeof (user as any)?.preferences === "object"
            ? ((user as any).preferences as Record<string, any>)
            : {};

        await prisma.user.update({
          where: { id: user.id },
          data: {
            preferences: {
              ...currentPrefs,
              isAdmin,
            } as any, // JSON field
          },
        });
      } catch {
        // Swallow errors so sign-in isn't blocked
      }
    },
  },
});
