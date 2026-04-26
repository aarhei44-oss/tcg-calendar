
// /app/app/auth.ts
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterUser, AdapterAccount } from "next-auth/adapters";
import { prisma } from "../app/lib/prisma";

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** Normalize emails; return string | null to keep types strict. */
function normalizeEmail(email?: string | null): string | null {
  const v = (email ?? "").trim().toLowerCase();
  return v.length ? v : null;
}

/**
 * Adapter wrapper:
 * - OPTION C: Fail creation when email is null.
 * - Return existing user if a create would violate unique email.
 * - Upsert accounts to avoid unique constraint races.
 */
function SafePrismaAdapter(): Adapter {
  const base = PrismaAdapter(prisma) as Adapter;

  return {
    ...base,

    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      const normalized = normalizeEmail(email);
      if (!normalized) return null;
      if (typeof base.getUserByEmail === "function") {
        return base.getUserByEmail(normalized);
      }
      const existing = await prisma.user.findUnique({
        where: { email: normalized },
      });
      return (existing as unknown as AdapterUser) ?? null;
    },

    async createUser(data: Omit<AdapterUser, "id">): Promise<AdapterUser> {
      const email = normalizeEmail(data.email);

      // OPTION C: hard fail if email is null or missing
      if (!email) {
        throw new Error("Cannot create user without a valid email.");
      }

      try {
        const created = await (base.createUser as (
          d: Omit<AdapterUser, "id">
        ) => Promise<AdapterUser>)({
          ...data,
          email, // string (non-null)
        });
        return created;
      } catch (err) {
        // If unique email error occurred, fetch and return existing user
        const existing = await prisma.user.findUnique({
          where: { email },
        });
        if (existing) return existing as unknown as AdapterUser;
        throw err;
      }
    },

    async linkAccount(account: AdapterAccount): Promise<void> {
      // Prefer base implementation
      try {
        if (typeof base.linkAccount === "function") {
          await base.linkAccount(account as any);
          return;
        }
      } catch {
        // fall through to upsert
      }

      const {
        provider,
        providerAccountId,
        userId,
        type,
        refresh_token,
        access_token,
        expires_at,
        token_type,
        scope,
        id_token,
        session_state,
      } = account as AdapterAccount & Record<string, any>;

      await prisma.account.upsert({
        where: {
          provider_providerAccountId: { provider, providerAccountId },
        },
        update: {
          userId,
          type,
          refresh_token: refresh_token ?? null,
          access_token: access_token ?? null,
          expires_at: expires_at ?? null,
          token_type: token_type ?? null,
          scope: scope ?? null,
          id_token: id_token ?? null,
          session_state: session_state ?? null,
        },
        create: {
          userId,
          type,
          provider,
          providerAccountId,
          refresh_token: refresh_token ?? null,
          access_token: access_token ?? null,
          expires_at: expires_at ?? null,
          token_type: token_type ?? null,
          scope: scope ?? null,
          id_token: id_token ?? null,
          session_state: session_state ?? null,
        },
      });
    },
  };
}

export const authOptions: NextAuthOptions = {
  adapter: SafePrismaAdapter(),
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
      // Normalize the profile email. If null, our signIn callback will intercept.
      profile(profile: any) {
        const email = normalizeEmail(profile?.email); // string | null
        return {
          id: profile?.sub ?? profile?.id,
          name: profile?.name ?? null,
          email,
          image: profile?.picture ?? null,
        } as any;
      },
    }),
  ],

  callbacks: {
    /**
     * Guard sign-in BEFORE user creation:
     * - If no email, short-circuit with a redirect (or return false to block).
     * - Otherwise allow sign-in to proceed.
     */
    async signIn({ user, account, profile }) {
      // Try to get an email from any of the sources; normalize it
      const emailFromProfile = normalizeEmail((profile as any)?.email);
      const emailFromUser = normalizeEmail((user as any)?.email);
      const email = emailFromProfile ?? emailFromUser;

      if (!email) {
        // Block sign-in cleanly. Choose one of the following:
        // 1) Return a redirect path (recommended UX)
        return "/auth/error?reason=no_email";
        // 2) Or: return false; // to block with the default error
      }

      // If you want to enforce domain restrictions, you could add them here as well.
      return true;
    },

    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id;
      }
      return session;
    },
  },

  events: {
    /**
     * Keep your admin prefs sync, but do nothing if email is absent.
     * This runs AFTER signIn callback returns true.
     */
    async signIn({ user }) {
      try {
        const email = normalizeEmail(user?.email);
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
