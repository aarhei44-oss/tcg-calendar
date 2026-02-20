
// /app/pages/api/admin/enable-profiles.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { enableProfilesAndSeedData } from '../../../app/data/prismaRepo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      info: 'POST this endpoint with { installs: string[], options?: { seed?: boolean } }',
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});
    const installs: string[] = Array.isArray(body?.installs) ? body.installs : [];
    const options = body?.options ?? {};

    if (!installs.length) {
      return res.status(400).json({ ok: false, error: 'installs[] required' });
    }

    await enableProfilesAndSeedData(installs, options);
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? 'unknown error' });
  }
}
