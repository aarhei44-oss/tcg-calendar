// Centralized utility functions for date formatting and absolute URL construction

/**
 * Formats a date as YYYY-MM-DD or returns an empty string if invalid.
 * Accepts string, Date, or null/undefined.
 */
export function fmtDate(d?: string | Date | null): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

/**
 * Returns an absolute URL for a given path, using window.location if available.
 * Falls back to just the path if window is not defined (SSR).
 */
export function absUrl(path: string): string {
  if (typeof window !== 'undefined' && window.location) {
    const base = window.location.origin;
    return path.startsWith('/') ? base + path : base + '/' + path;
  }
  return path;
}
