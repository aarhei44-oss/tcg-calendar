// /app/types/next-auth.d.ts
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string; // ✅ include id
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  // Optional but helpful if you access user.id in callbacks strongly typed
  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    // Add any custom fields in your Prisma User (e.g., preferences) here if you want:
    preferences?: any;
  }
}
