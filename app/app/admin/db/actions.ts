"use server";

import { prisma } from "../../../app/lib/prisma";
import { isAdminByPrefs } from "../../../data/admin/adminRepo";
import { getSession } from "../../../app/auth";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { enableProfilesAndSeedData } from '../../../data/calendar/calendarRepo';

export async function adminEnableProfiles(installs: string[], options?: unknown) {
  await enableProfilesAndSeedData(installs, options);
  return { ok: true };
}
function modelToDelegateKey(model: string) {
  return model.slice(0, 1).toLowerCase() + model.slice(1);
}

function getDelegate(model: string) {
  const key = modelToDelegateKey(model);
  const delegate = (prisma as any)[key];
  if (!delegate) {
    throw new Error(
      `No Prisma delegate found for model "${model}" (key "${key}")`,
    );
  }
  return delegate;
}

function modelHasId(model: string) {
  const m = Prisma.dmmf.datamodel.models.find((x) => x.name === model);
  return !!m?.fields.find((f) => f.name === "id");
}

export async function ensureAdmin(): Promise<string> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");
  const isAdmin = await isAdminByPrefs(userId);
  if (!isAdmin) throw new Error("Forbidden");
  return userId;
}

export async function removeDuplicateReleaseEvents() {
  await ensureAdmin();

  const events = await prisma.releaseEvent.findMany({
    orderBy: [
      { productSetId: "asc" },
      { type: "asc" },
      { dateType: "asc" },
      { dateExact: "asc" },
      { dateStart: "asc" },
      { dateEnd: "asc" },
      { windowGranularity: "asc" },
      { windowStart: "asc" },
      { windowEnd: "asc" },
      { status: "asc" },
    ],
  });

  const seen = new Set<string>();
  const duplicateIds: string[] = [];

  for (const ev of events) {
    const key = JSON.stringify({
      productSetId: ev.productSetId,
      type: ev.type,
      dateType: ev.dateType,
      dateExact: ev.dateExact?.toISOString() ?? null,
      dateStart: ev.dateStart?.toISOString() ?? null,
      dateEnd: ev.dateEnd?.toISOString() ?? null,
      windowGranularity: ev.windowGranularity,
      windowStart: ev.windowStart?.toISOString() ?? null,
      windowEnd: ev.windowEnd?.toISOString() ?? null,
      status: ev.status,
      sourceSummary: ev.sourceSummary,
      isManualOverride: ev.isManualOverride,
    });

    if (seen.has(key)) {
      duplicateIds.push(ev.id);
    } else {
      seen.add(key);
    }
  }

  if (duplicateIds.length > 0) {
    await prisma.releaseEvent.deleteMany({ where: { id: { in: duplicateIds } } });
  }

  return { removed: duplicateIds.length };
}

export async function dedupeReleaseEventsAction(formData: FormData) {
  "use server";
  const result = await removeDuplicateReleaseEvents();
  revalidatePath("/admin");
  redirect(
    `/admin?ok=1&msg=${encodeURIComponent(
      `Removed ${result.removed} duplicate release event(s)`,
    )}`,
  );
}

export async function listRows(model: string, take = 25) {
  await ensureAdmin();
  const delegate = getDelegate(model);
  const orderBy = modelHasId(model) ? { id: "desc" } : undefined;
  return (await delegate.findMany({
    take,
    ...(orderBy ? { orderBy } : {}),
  })) as any[];
}

export async function createRow(model: string, data: any) {
  await ensureAdmin();
  const delegate = getDelegate(model);
  return (await delegate.create({ data })) as any;
}

export async function updateRow(model: string, where: any, data: any) {
  await ensureAdmin();
  if (!where || typeof where !== "object") {
    throw new Error(
      "`where` must be an object (e.g., { id: ... } or composite key).",
    );
  }
  const delegate = getDelegate(model);
  return (await delegate.update({ where, data })) as any;
}

export async function deleteRow(model: string, where: any) {
  await ensureAdmin();
  if (!where || typeof where !== "object") {
    throw new Error(
      "`where` must be an object (e.g., { id: ... } or composite key).",
    );
  }
  const delegate = getDelegate(model);
  return (await delegate.delete({ where })) as any;
}

/** Build absolute URL for calling Pages API (bulk seed) */
async function absUrl(path: string) {
  const hs = await headers();
  const host = hs.get("x-forwarded-host") ?? hs.get("host") ?? "localhost:3000";
  const proto =
    hs.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}${path}`;
}

export async function toggleInstallEnabled(formData: FormData) {
  await ensureAdmin();

  const id = String(formData.get("id") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "true";
  if (!id) redirect("/admin?ok=0&msg=missing%20id");

  await prisma.tcgProfileInstall.update({
    where: { id },
    data: { enabled },
  });

  revalidatePath("/admin");
  redirect("/admin?ok=1");
}

export async function enableAndSeedSelected(formData: FormData) {
  await ensureAdmin();

  const selectedIds = formData.getAll("install").map(String).filter(Boolean);
  const seed = formData.get("seed") === "on";

  if (selectedIds.length === 0) {
    redirect("/admin?ok=0&msg=No%20installs%20selected");
  }

  const url = await absUrl("/api/admin/enable-profiles");
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    // NOTE: matches your handler: { installs, options: { seed } }
    body: JSON.stringify({ installs: selectedIds, options: { seed } }),
  });

  if (!res.ok) {
    const msg = encodeURIComponent(
      `Enable & seed failed: ${res.status} ${await res.text()}`
    );
    redirect(`/admin?ok=0&msg=${msg}`);
  }

  revalidatePath("/admin");
  redirect("/admin?ok=1");
}
