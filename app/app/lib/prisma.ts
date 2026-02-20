

import { initDb } from './initDb';

import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as path from 'node:path';

// If you keep your runtime simple, you can rely on DATABASE_URL directly;
// but to be robust across Windows paths, normalize and prefix with file:
const rawUrl = process.env.DATABASE_URL ?? 'file:./data/app.db';
const relativePath = rawUrl.startsWith('file:') ? rawUrl.slice('file:'.length) : rawUrl;
const absDbPath = path.resolve(process.cwd(), relativePath);
const sqliteUrl = `file:${absDbPath.replace(/\\/g, '/')}`;

const adapter = new PrismaBetterSqlite3({ url: sqliteUrl });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dbReady = initDb();
