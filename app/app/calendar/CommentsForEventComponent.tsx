// /app/app/calendar/CommentsForEventComponent.tsx
import React from 'react';
import { getSession } from '../auth';
import { listEventComments, getUserById } from '../../data/admin/adminRepo';
import { commentAction, deleteCommentAction } from './actions';
import { fmtDate } from '../lib/utils';

export default async function CommentsForEvent({ eventId }: { eventId: string }) {
  const session = await getSession();
  const currentUserId = session?.user?.id ?? null;

  let isAdmin = false;
  if (currentUserId) {
    const u = await getUserById(currentUserId);
    isAdmin = u?.role === 'admin';
  }

  const comments = await listEventComments(eventId);

  // Show all comments; delete controls are limited to author/admin.
  const visibleComments = comments;

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
                    <button type="submit" className="ml-2 text-red-500 hover:underline">Delete</button>
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
