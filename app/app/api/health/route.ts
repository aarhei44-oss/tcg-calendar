
// /app/app/api/health/route.ts
import { prisma } from '../../lib/prisma';
import { initDb } from '../../lib/initDb';

export async function GET() {
  await initDb(); // ensures migrations (prod) + PRAGMAs applied
  await prisma.$queryRaw`SELECT 1`;
  return Response.json({ ok: true });
}
