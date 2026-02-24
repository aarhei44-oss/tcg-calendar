// /app/app/auth.ts
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "app/lib/prisma";

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Some v4 typings don’t include this; cast if TS complains.
      // @ts-ignore
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
callbacks: {
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id;
      }
      return session;
    },
  },

  events: {
    async signIn({ user }) {
      try {
        const email = (user?.email ?? "").toLowerCase();
        if (!email) return;

        const isAdmin = adminEmails.includes(email);
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
        // swallow errors so sign-in isn't blocked
      }
    },
  },
};

// v4 helper for server components/actions
export async function getSession() {
  return getServerSession(authOptions);
}
