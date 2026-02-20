
// /app/app/lib/sqliteBootstrap.ts
'use server';

import { PrismaClient } from '@prisma/client';

let initialized: Promise<void> | null = null;

/**
 * Ensures PRAGMA journal_mode=WAL and busy_timeout=10000 are set once per process.
 * Call this early (before lots of queries) to reduce SQLITE_BUSY errors.
 */
export async function ensureDbReady(prisma: PrismaClient): Promise<void> {
  if (!initialized) {
    initialized = (async () => {
      // WAL: better concurrency for mixed read/write workloads
      await prisma.$executeRawUnsafe(`PRAGMA journal_mode=WAL;`);
      // Wait up to 10 seconds for locks instead of failing fast
      await prisma.$executeRawUnsafe(`PRAGMA busy_timeout=10000;`);
      // Reasonable pairing with WAL to reduce fsync pressure
      await prisma.$executeRawUnsafe(`PRAGMA synchronous=NORMAL;`);
    })().catch((err) => {
      initialized = null; // reset if it failed so subsequent calls can retry
      throw err;
    });
  }
  return initialized;
}
