
// /app/prisma.config.ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // (we'll wire seeding in package.json later)
  },
  datasource: {
    // Use the same path as before, relative to /app
    // Note: Prisma CLI resolves this from the project root.
    url: env('DATABASE_URL'),
  },
});
