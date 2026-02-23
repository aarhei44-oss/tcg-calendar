import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
// Use relative imports if your alias isn't guaranteed here:
import { prisma } from "../../../lib/prisma";
import { isEmailAdminAsync } from "app/data/prismaRepo";

const handler = NextAuth({
   // keep this for dev to avoid CSRF/cookie host mismatches
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true, // DEV ONLY
    }),
  ],
  session: { strategy: "database" },

  // Remove the previous callbacks.signIn update (or leave callbacks empty)
  callbacks: {
    // (optional) keep other callbacks if you added them; DON'T update the DB here
  },

  events: {
    // Runs AFTER the user & account are created/linked
    async signIn({ user }) {
      try {
        if (user?.id && user?.email) {
          const flag = await isEmailAdminAsync(user.email);
          await prisma.user.update({
            where: { id: user.id },
            data: {
              preferences: {
                ...(typeof (user as any).preferences === "object"
                  ? (user as any).preferences
                  : {}),
                isAdmin: flag,
              } as any,
            },
          });
        }
      } catch (e) {
        // Swallow to avoid blocking sign-in; you can console.log(e) temporarily in dev
      }
    },
  },
});

export { handler as GET, handler as POST };
