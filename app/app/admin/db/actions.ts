
"use server";

import { prisma } from "app/lib/prisma";
import { isAdminByPrefs } from "app/data/prismaRepo";
import { auth } from "app/auth";

// Whitelist the tables you want to expose
const delegates = {
  User: prisma.user,
  ProductSet: prisma.productSet,
  ReleaseEvent: prisma.releaseEvent,
  SourceClaim: prisma.sourceClaim,
  ScanRun: prisma.scanRun,
  DiscoveryHit: prisma.discoveryHit,
  TcgProfilePackage: prisma.tcgProfilePackage,
  TcgProfileInstall: prisma.tcgProfileInstall,
  UserNote: prisma.userNote,
  JobLock: prisma.jobLock,
} as const;

type TableName = keyof typeof delegates;

async function ensureAdmin() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !(await isAdminByPrefs(userId))) {
    throw new Error("Not authorized");
  }
}

export function listTables(): TableName[] {
  return Object.keys(delegates) as TableName[];
}

export async function listRows(table: TableName, take = 25) {
  await ensureAdmin();
  return (await (delegates[table] as any).findMany({
    take,
    orderBy: { id: "desc" },
  })) as any[];
}

export async function createRow(table: TableName, data: any) {
  await ensureAdmin();
  return (await (delegates[table] as any).create({ data })) as any;
}

export async function updateRow(table: TableName, id: string | number, data: any) {
  await ensureAdmin();
  return (await (delegates[table] as any).update({
    where: { id },
    data,
  })) as any;
}

export async function deleteRow(table: TableName, id: string | number) {
  await ensureAdmin();
  return (await (delegates[table] as any).delete({
    where: { id },
  })) as any;
}
