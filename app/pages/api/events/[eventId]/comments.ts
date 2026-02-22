
// /app/pages/api/events/[eventId]/comments.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { addEventComment, listEventComments } from 'app/data/prismaRepo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate eventId from the dynamic route
  const q = req.query;
  const eventId = Array.isArray(q.eventId) ? q.eventId[0] : q.eventId;
  if (!eventId) return res.status(400).json({ ok: false, error: 'eventId required' });

  if (req.method === 'GET') {
    try {
      const comments = await listEventComments(eventId);
      return res.status(200).json({ ok: true, comments });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message ?? 'Failed to list comments' });
    }
  }

  if (req.method === 'POST') {
    // Read the userId cookie (set earlier via /api/user/init)
    const userId = (req.cookies as any)?.userId as string | undefined;
    if (!userId) return res.status(401).json({ ok: false, error: 'Not signed in' });

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const content = String(body?.content ?? '').trim();
      if (!content) return res.status(400).json({ ok: false, error: 'content required' });

      await addEventComment(eventId, userId, content);
      return res.status(200).json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message ?? 'Failed to add comment' });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
