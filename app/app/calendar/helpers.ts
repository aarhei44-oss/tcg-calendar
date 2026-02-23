export function firstStr(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseCsvInput(input?: string | string[]): string[] | undefined {
  const raw = firstStr(input);
  if (!raw) return undefined;
  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

export function buildUrlWith(
  sp: Record<string, string | string[]>,
  updates: Record<string, string[] | undefined>,
) {
  const qp = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (Object.prototype.hasOwnProperty.call(updates, k)) continue;
    if (Array.isArray(v)) v.forEach((x) => qp.append(k, x));
    else if (v) qp.append(k, v);
  }
  for (const [k, arr] of Object.entries(updates)) {
    if (!arr || arr.length === 0) continue;
    arr.forEach((x) => qp.append(k, x));
  }
  const qs = qp.toString();
  return qs ? `/calendar?${qs}` : `/calendar`;
}

const ALL_TYPES = ["shelf", "prerelease", "promo", "special"] as const;
const ALL_STATUS = [
  "announced",
  "confirmed",
  "delayed",
  "canceled",
  "rumor",
] as const;
