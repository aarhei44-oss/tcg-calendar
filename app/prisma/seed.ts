/* eslint-disable no-console */
// /app/prisma/seed.ts
// Run with: npx tsx prisma/seed.ts [--fresh]
// Purpose: Idempotent seed for PR-1 data layer with optional --fresh reset.

import {
  PrismaClient,
  Prisma,
  SourceTier,
  SourceDisposition,
  DateType,
  ReleaseEventType,
  ReleaseStatus,
  WindowGranularity,
  ScanScopeType,
  ScanStatus,
  ScanTrigger,
  Region,
} from "@prisma/client";

import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import * as path from "node:path";
import * as fs from "node:fs";

// --- Resolve DATABASE_URL to an absolute filesystem path & ensure folder exists ---
const rawUrl = process.env.DATABASE_URL;

// Default if env is missing
let relativePath = "./data/app.db";
if (typeof rawUrl === "string" && rawUrl.length > 0) {
  if (rawUrl.startsWith("file:")) {
    relativePath = rawUrl.slice("file:".length);
  } else {
    relativePath = rawUrl;
  }
}

// Resolve relative to the current working directory (we run from /app)
const absDbPath = path.resolve(process.cwd(), relativePath);

// Ensure the parent directory exists
const dir = path.dirname(absDbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Build a proper file: URL that works on Windows (use forward slashes)
const sqliteUrl = `file:${absDbPath.replace(/\\/g, "/")}`;

// ✅ Use the URL-based constructor in v7
const adapter = new PrismaBetterSqlite3({ url: sqliteUrl });

const prisma = new PrismaClient({
  adapter,
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "warn", "error"]
      : ["error"],
});

// ------------------------------
// Utilities
// ------------------------------

type RNG = () => number;
function createRng(seed: number): RNG {
  // simple LCG for deterministic-ish randomness per run
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function pickWeighted<T>(rng: RNG, items: { value: T; weight: number }[]): T {
  const total = items.reduce((a, b) => a + b.weight, 0);
  let r = rng() * total;
  for (const it of items) {
    if (r < it.weight) return it.value;
    r -= it.weight;
  }
  return items[items.length - 1].value;
}

function randInt(rng: RNG, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function normalizeWindow(
  start: Date,
  granularity: WindowGranularity,
): { start: Date; end: Date } {
  const s = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  switch (granularity) {
    case "MONTH": {
      const e = new Date(
        Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, 0, 23, 59, 59, 999),
      );
      return { start: s, end: e };
    }
    case "QUARTER": {
      const qStartMonth = Math.floor(s.getUTCMonth() / 3) * 3;
      const qs = new Date(Date.UTC(s.getUTCFullYear(), qStartMonth, 1));
      const qe = new Date(
        Date.UTC(qs.getUTCFullYear(), qStartMonth + 3, 0, 23, 59, 59, 999),
      );
      return { start: qs, end: qe };
    }
    case "HALF": {
      const hStartMonth = s.getUTCMonth() < 6 ? 0 : 6;
      const hs = new Date(Date.UTC(s.getUTCFullYear(), hStartMonth, 1));
      const he = new Date(
        Date.UTC(hs.getUTCFullYear(), hStartMonth + 6, 0, 23, 59, 59, 999),
      );
      return { start: hs, end: he };
    }
    case "YEAR": {
      const ys = new Date(Date.UTC(s.getUTCFullYear(), 0, 1));
      const ye = new Date(
        Date.UTC(s.getUTCFullYear(), 11, 31, 23, 59, 59, 999),
      );
      return { start: ys, end: ye };
    }
  }
}

// ------------------------------
// Config & constants
// ------------------------------

const TCG_PACKAGES = [
  { slug: "one-piece", name: "One Piece", version: "1.0.0" },
  {
    slug: "magic-the-gathering",
    name: "Magic: The Gathering",
    version: "1.0.0",
  },
  { slug: "gundam-tcg", name: "Gundam TCG", version: "1.0.0" },
  { slug: "pokemon", name: "Pokemon", version: "1.0.0" },
  { slug: "riftbound", name: "Riftbound", version: "1.0.0" },
  { slug: "lorcana", name: "Lorcana", version: "1.0.0" },
  { slug: "flesh-and-blood", name: "Flesh and Blood", version: "1.0.0" },
];

const DISCOVERY_PLACEHOLDERS = [
  { host: "official.tcg.example", tier: SourceTier.official, weight: 3 },
  { host: "distributor.example", tier: SourceTier.distributor, weight: 2 },
  { host: "retailer.example", tier: SourceTier.retailer, weight: 2 },
  { host: "aggregator.example", tier: SourceTier.aggregator, weight: 1 },
] as const;

const TIER_CONFIDENCE: Record<SourceTier, number> = {
  official: 1.0,
  distributor: 0.85,
  retailer: 0.7,
  aggregator: 0.5,
};

// Desired ReleaseEvent dateType mix
const DATE_TYPE_WEIGHTS = [
  { value: DateType.EXACT, weight: 50 },
  { value: DateType.RANGE, weight: 20 },
  { value: DateType.WINDOW, weight: 20 },
  { value: DateType.TBD, weight: 10 },
];

// ------------------------------
// Core seed helpers
// ------------------------------

async function resetDatabase(): Promise<void> {
  // Safe data wipe without dropping schema (works for SQLite)
  // Order matters only if FK cascades not set; we still do bottom-up to be safe.
  await prisma.$executeRawUnsafe("PRAGMA foreign_keys = OFF;");
  await prisma.userNote.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.sourceClaim.deleteMany({});
  await prisma.releaseEvent.deleteMany({});
  await prisma.productSet.deleteMany({});
  await prisma.discoveryHit.deleteMany({});
  await prisma.scanRun.deleteMany({});
  await prisma.jobLock.deleteMany({});
  await prisma.tcgProfileInstall.deleteMany({});
  await prisma.tcgProfilePackage.deleteMany({});
  await prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON;");
}

export async function upsertPackagesAndInstalls() {
  const createdInstalls: { id: string; packageId: string; slug: string }[] = [];

  for (const p of TCG_PACKAGES) {
    const pkg = await prisma.tcgProfilePackage.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        version: p.version,
        discoveryConfig: {
          // Simple placeholder config
          strategy: "simulated",
          schedule: "weekly",
        },
        sourceConfigs: {
          sources: DISCOVERY_PLACEHOLDERS.map((d) => ({
            host: d.host,
            tier: d.tier,
          })),
        },
      },
      create: {
        slug: p.slug,
        name: p.name,
        version: p.version,
        discoveryConfig: {
          strategy: "simulated",
          schedule: "weekly",
        },
        sourceConfigs: {
          sources: DISCOVERY_PLACEHOLDERS.map((d) => ({
            host: d.host,
            tier: d.tier,
          })),
        },
      },
    });

    // Create a disabled install if one does not exist for this package+version
    const existingInstall = await prisma.tcgProfileInstall.findFirst({
      where: { packageId: pkg.id, installedVersion: p.version },
    });

    const install =
      existingInstall ??
      (await prisma.tcgProfileInstall.create({
        data: {
          packageId: pkg.id,
          installedVersion: p.version,
          enabled: false,
          settings: { notes: "seeded default install (disabled)" },
        },
      }));

    createdInstalls.push({ id: install.id, packageId: pkg.id, slug: p.slug });
  }

  return createdInstalls;
}

function makeSetCode(slug: string, idx: number): string {
  const prefix = slug
    .split("-")
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
  return `${prefix}-${String(idx).padStart(2, "0")}`;
}

function randomStatus(rng: RNG): ReleaseStatus {
  // mostly announced/confirmed, with a few delayed/canceled/rumor
  const opts: { value: ReleaseStatus; weight: number }[] = [
    { value: "announced", weight: 40 },
    { value: "confirmed", weight: 35 },
    { value: "delayed", weight: 15 },
    { value: "rumor", weight: 8 },
    { value: "canceled", weight: 2 },
  ];
  return pickWeighted(rng, opts);
}

function randomEventType(rng: RNG): ReleaseEventType {
  const opts: { value: ReleaseEventType; weight: number }[] = [
    { value: "shelf", weight: 50 },
    { value: "prerelease", weight: 25 },
    { value: "promo", weight: 15 },
    { value: "special", weight: 10 },
  ];
  return pickWeighted(rng, opts);
}

function randomWindowGranularity(rng: RNG): WindowGranularity {
  return pickWeighted(rng, [
    { value: "MONTH", weight: 50 },
    { value: "QUARTER", weight: 25 },
    { value: "HALF", weight: 15 },
    { value: "YEAR", weight: 10 },
  ]);
}

function makeRandomReleaseEvent(
  rng: RNG,
  productSetId: string,
): Prisma.ReleaseEventCreateInput {
  const now = new Date();
  const base = addDays(now, randInt(rng, -120, 240)); // spread around past/future ~1y
  const dateType = pickWeighted(rng, DATE_TYPE_WEIGHTS);

  const type = randomEventType(rng);
  const status = randomStatus(rng);

  // Confidence roughly tied to status (confirmed higher)
  const confBase = {
    announced: 60,
    confirmed: 90,
    delayed: 70,
    canceled: 30,
    rumor: 20,
  } as const;
  const confidence = Math.min(
    100,
    Math.max(0, Math.round(confBase[status] + (rng() - 0.5) * 20)),
  );

  const data: Prisma.ReleaseEventCreateInput = {
    productSet: { connect: { id: productSetId } },
    type,
    dateType,
    region: Region.US,
    status,
    confidence,
    sourceSummary: "Seeded simulated data",
    lastSeenAt: new Date(),
    isManualOverride: false,
  };

  // Populate date fields based on dateType
  switch (dateType) {
    case "EXACT": {
      data.dateExact = base;
      break;
    }
    case "RANGE": {
      const end = addDays(base, randInt(rng, 3, 21));
      data.dateStart = base;
      data.dateEnd = end;
      break;
    }
    case "WINDOW": {
      const gran = randomWindowGranularity(rng);
      const { start, end } = normalizeWindow(base, gran);
      data.windowGranularity = gran;
      data.windowStart = start;
      data.windowEnd = end;
      break;
    }
    case "TBD": {
      // leave date fields null
      break;
    }
  }

  return data;
}

async function createSourceClaimsForEvent(
  rng: RNG,
  eventId: string,
  event: Prisma.ReleaseEventCreateInput,
) {
  const claimsCount = randInt(rng, 1, 3);
  const hosts = [...DISCOVERY_PLACEHOLDERS];

  for (let i = 0; i < claimsCount; i++) {
    const pickIdx = randInt(rng, 0, hosts.length - 1);
    const pick = hosts.splice(pickIdx, 1)[0];
    const disposition = pickWeighted(rng, [
      { value: SourceDisposition.used, weight: 70 },
      { value: SourceDisposition.ignored, weight: 15 },
      { value: SourceDisposition.conflict, weight: 15 },
    ]);

    // Mirror or conflict the event's date fields
    let dateType: DateType | null = event.dateType as DateType;
    let dateExact: Date | null = (event as any).dateExact ?? null;
    let dateStart: Date | null = (event as any).dateStart ?? null;
    let dateEnd: Date | null = (event as any).dateEnd ?? null;
    let windowGranularity: WindowGranularity | null =
      (event as any).windowGranularity ?? null;
    let windowStart: Date | null = (event as any).windowStart ?? null;
    let windowEnd: Date | null = (event as any).windowEnd ?? null;

    if (disposition === "conflict") {
      // Slightly alter the dates to represent disagreement
      if (dateType === "EXACT" && dateExact)
        dateExact = addDays(dateExact, randInt(rng, -7, 7));
      if (dateType === "RANGE" && dateStart && dateEnd) {
        dateStart = addDays(dateStart, randInt(rng, -5, 0));
        dateEnd = addDays(dateEnd, randInt(rng, 1, 7));
      }
      if (
        dateType === "WINDOW" &&
        windowStart &&
        windowEnd &&
        windowGranularity
      ) {
        // shift the window by one unit
        const shiftDays = { MONTH: 30, QUARTER: 90, HALF: 182, YEAR: 365 }[
          windowGranularity
        ];
        windowStart = addDays(windowStart, randInt(rng, -shiftDays, shiftDays));
        windowEnd = addDays(windowEnd, randInt(rng, -shiftDays, shiftDays));
      }
      // If TBD, keep TBD; conflict may be about different text, not dates.
    }

    const url = `https://${pick.host}/news/${eventId}/${i + 1}`;

    await prisma.sourceClaim.create({
      data: {
        releaseEventId: eventId,
        tier: pick.tier,
        disposition,
        confidenceWeight: TIER_CONFIDENCE[pick.tier] + (rng() - 0.5) * 0.1, // small noise
        url,
        host: pick.host,
        lastVerifiedAt: new Date(),
        dateType,
        dateExact,
        dateStart,
        dateEnd,
        windowGranularity: windowGranularity ?? undefined,
        windowStart,
        windowEnd,
        raw: { excerpt: "seeded mock content" },
      },
    });
  }
}

async function seedScanHistory(installs: { id: string }[]) {
  const now = new Date();

  // a couple of "all" scope runs
  const existingAll = await prisma.scanRun.findMany({
    where: { scopeType: "all" },
  });
  if (existingAll.length === 0) {
    await prisma.scanRun.createMany({
      data: [
        {
          scopeType: "all",
          status: "succeeded",
          trigger: "scheduled",
          totals: { found: 120, updated: 45, new: 20, conflicts: 6, errors: 1 },
          startedAt: addDays(now, -7),
          finishedAt: addDays(now, -7),
        },
        {
          scopeType: "all",
          status: "succeeded",
          trigger: "manual",
          totals: { found: 98, updated: 10, new: 5, conflicts: 2, errors: 0 },
          startedAt: addDays(now, -2),
          finishedAt: addDays(now, -2),
        },
      ],
    });
  }

  // a few per-tcg runs
  for (const inst of installs.slice(0, 3)) {
    const exists = await prisma.scanRun.findFirst({
      where: { scopeType: "tcg", scopeId: inst.id },
    });
    if (!exists) {
      await prisma.scanRun.create({
        data: {
          scopeType: ScanScopeType.tcg,
          scopeId: inst.id,
          status: ScanStatus.succeeded,
          trigger: ScanTrigger.scheduled,
          totals: { found: 20, updated: 8, new: 4, conflicts: 1, errors: 0 },
          startedAt: addDays(now, -3),
          finishedAt: addDays(now, -3),
        },
      });
    }
  }
}

async function seedDiscoveryHits(installs: { id: string }[], rng: RNG) {
  for (const inst of installs.slice(0, 3)) {
    const count = await prisma.discoveryHit.count({
      where: { tcgProfileInstallId: inst.id },
    });
    if (count > 0) continue;

    const n = randInt(rng, 2, 4);
    for (let i = 0; i < n; i++) {
      const src = pickWeighted(
        rng,
        DISCOVERY_PLACEHOLDERS.map((d) => ({ value: d, weight: d.weight })),
      );
      const url = `https://${src.host}/discover/${inst.id}/${i + 1}`;
      await prisma.discoveryHit.create({
        data: {
          tcgProfileInstallId: inst.id,
          url,
          title: "Simulated discovery hit",
          raw: { title: "Simulated discovery hit", tags: ["seed"] },
        },
      });
    }
  }
}

// ------------------------------
// Public helper: enable & generate data
// ------------------------------

export async function enableProfilesAndSeedData(params: {
  installs: { id: string; slug?: string }[];
  seed?: number;
  fresh?: boolean; // allow caller (e.g., Docker) to force a clean reseed
}) {
  const rng = createRng(params.seed ?? 1337);

  for (const instRef of params.installs) {
    // Ensure install exists
    const pre = await prisma.tcgProfileInstall.findUnique({
      where: { id: instRef.id },
      select: { id: true, packageId: true },
    });
    if (!pre) {
      throw new Error(
        `Seed error: install not found for id="${instRef.id}". Run package+install bootstrap first.`,
      );
    }

    // Ensure enabled (idempotent)
    const install = await prisma.tcgProfileInstall.update({
      where: { id: instRef.id },
      data: { enabled: true },
      select: { id: true, packageId: true },
    });

    const pkg = await prisma.tcgProfilePackage.findUnique({
      where: { id: install.packageId },
      select: { slug: true },
    });
    const slug = instRef.slug ?? pkg?.slug ?? "tcg";

    // Optional FRESH: wipe prior seeded data for this install
    if (params.fresh) {
      await prisma.$transaction(async (tx) => {
        const setIds = await tx.productSet.findMany({
          where: { tcgProfileInstallId: install.id },
          select: { id: true },
        });
        const ids = setIds.map((s) => s.id);
        if (ids.length) {
          await tx.sourceClaim.deleteMany({
            where: { releaseEvent: { productSetId: { in: ids } } },
          });
          await tx.releaseEvent.deleteMany({
            where: { productSetId: { in: ids } },
          });
        }
        await tx.productSet.deleteMany({
          where: { tcgProfileInstallId: install.id },
        });
      });
    }

    // Seed sets & events deterministically each run (no duplicates if fresh=true)
    await prisma.$transaction(async (tx) => {
      const setCount = randInt(rng, 4, 6);

      for (let sIdx = 1; sIdx <= setCount; sIdx++) {
        const code = makeSetCode(slug, sIdx);

        // Use upsert on (installId, code).
        // REQUIREMENT: Prisma schema has @@unique([tcgProfileInstallId, code], name: "install_set_code")
        const set = await tx.productSet.upsert({
          where: {
            install_set_code: { tcgProfileInstallId: install.id, code },
          } as any,
          update: {
            name: `${slug.replace(/-/g, " ")} Set ${sIdx}`,
            releaseQuarter: `Q${((sIdx - 1) % 4) + 1}`,
            meta: { seeded: true },
          },
          create: {
            tcgProfileInstallId: install.id,
            code,
            name: `${slug.replace(/-/g, " ")} Set ${sIdx}`,
            releaseQuarter: `Q${((sIdx - 1) % 4) + 1}`,
            meta: { seeded: true },
          },
          select: { id: true },
        });

        // For each set, create 1–3 events
        const eventCount = randInt(rng, 1, 3);
        for (let eIdx = 1; eIdx <= eventCount; eIdx++) {
          const eventInput = makeRandomReleaseEvent(rng, set.id);

          const event = await tx.releaseEvent.create({ data: eventInput });

          // Deterministic delay chance (use rng, not Math.random)
          const delayChance = rng();
          if (delayChance < 0.15 && event.status !== "canceled") {
            await tx.releaseEvent.update({
              where: { id: event.id },
              data: { status: ReleaseStatus.delayed },
            });
          }

          // Source claims — current helper (non-idempotent) is fine because we use `fresh`
          await createSourceClaimsForEvent(rng, event.id, eventInput);
        }
      }
    });
  }
}

// ------------------------------
// Main entrypoint
// ------------------------------

async function main() {
  const args = process.argv.slice(2);
  const isFresh = args.includes("--fresh");

  if (isFresh) {
    console.log(
      "⚠️  --fresh detected: wiping existing data (but keeping schema)...",
    );
    await resetDatabase();
  }

  // Packages & installs (disabled by default)
  const installs = await upsertPackagesAndInstalls();

  // Discovery hits + scan history (simulated)
  const rng = createRng(20260218);
  await seedDiscoveryHits(installs, rng);
  await seedScanHistory(installs);

  // NOTE: We DO NOT enable any profiles by default per requirements.
  // To generate ProductSets/ReleaseEvents/SourceClaims for specific installs,
  // you can call enableProfilesAndSeedData({ installs: [...] }) here
  // OR run a separate script later.

  console.log(
    "✅ Seed completed (packages, installs disabled, admin user, discovery hits, scan history).",
  );
  console.log(
    "ℹ️  To generate sets/events for an install: import and call enableProfilesAndSeedData({...}).",
  );
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
