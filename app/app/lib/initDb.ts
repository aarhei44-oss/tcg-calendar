
// /app/app/lib/initDb.ts
'use server';

import { prisma } from './prisma';                 // your existing adapter-based client
import { ensureDbReady } from './sqliteBootstrap';


let initPromise: Promise<void> | null = null;

export async function initDb(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      
      await ensureDbReady(prisma);
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }


  
  return initPromise;
}
