
// /app/pages/api/health.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../app/lib/prisma';
import { initDb } from '../../../app/lib/initDb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await initDb();                 // PRAGMAs / readiness (no migrate-on-boot)
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? 'unknown error' });
  }
}
