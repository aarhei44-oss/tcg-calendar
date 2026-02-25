
// /app/app/calendar/CommentsForEvent.tsx
import React from 'react';
import { headers, cookies as rscCookies } from 'next/headers';
import { getUserById } from 'app/data/prismaRepo';
import { commentAction, deleteCommentAction } from './page'; // re-use existing actions
import { absUrl } from './absUrlHelper';

// Small util
function fmtDate(d?: string | Date | null): string {
  if (!d) return '';
  const iso = typeof d === 'string' ? d : d.toISOString();
  return new Date(iso).toISOString().slice(0, 10);
}

export default async function CommentsForEvent({ eventId }: { eventId: string }) {
  const hs = await headers();
  const cookie = hs.get('cookie') ?? '';

  const store = await rscCookies();
  const currentUserId = store.get('userId')?.value ?? null;
  let isAdmin = false;
  if (currentUserId) {
    const u = await getUserById(currentUserId);
    isAdmin = (u?.role === 'admin');
  }

  const res = await fetch(await absUrl(`/api/events/${eventId}/comments`), {
    cache: 'no-store',
    headers: { cookie },
  });
  const json = res.ok ? await res.json() : { comments: [] as any[] };
  const comments: Array<{ id: string; content: string; user?: { id?: string; name?: string } }> =
    json.comments ?? [];

  // Only show comments authored by the current user
  const visibleComments = currentUserId ? comments.filter(c => c.user?.id === currentUserId) : [];

  return (
    <div className="space-y-3">
      {/* Add comment */}
      {currentUserId ? (
        <form action={commentAction} className="flex items-center gap-2">
          <input type="hidden" name="eventId" value={eventId} />
          <input
            name="content"
            type="text"
            className="border rounded px-2 py-1 flex-1"
            placeholder="Add a comment"
            required
            maxLength={1000}
          />
          <button type="submit" className="px-2 py-1 rounded bg-gray-800 text-white text-xs">Post</button>
        </form>
      ) : (
        <p className="text-xs text-gray-500">Set your name (top of Calendar) to add comments.</p>
      )}

      {/* List */}
      {visibleComments.length === 0 ? (
        <p className="text-xs text-gray-500">You haven’t added any comments yet.</p>
      ) : (
        <ul className="space-y-1">
          {visibleComments.map((c) => {
            const canDelete = !!currentUserId && (isAdmin || c.user?.id === currentUserId);
            return (
              <li key={c.id} className="text-xs flex items-start justify-between gap-2">
                <div className="flex-1">
                  <span className="font-medium">{c.user?.name ?? 'You'}</span>{' '}
                  <span className="text-gray-700">— {c.content}</span>
                </div>
                {canDelete && (
                  <form action={deleteCommentAction}>
                    <input type="hidden" name="commentId" value={c.id} />
                    <button
                      type="submit"
                      title="Delete comment"
                      className="text-gray-500 hover:text-rose-600 p-1"
                      aria-label="Delete comment"
                    >
                      {/* Trash icon */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.5 3a1 1 0 00-.894.553L7.382 4H5a1 1 0 100 2h.278l.77 9.242A2 2 0 008.043 17h3.914a2 2 0 001.995-1.758L14.722 6H15a1 1 0 100-2h-2.382l-.224-.447A1 1 0 0011.5 3h-3zM9 7a1 1 0 012 0v7a1 1 0 11-2 0V7z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
