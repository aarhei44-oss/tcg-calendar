"use server";

import { prisma } from "app/lib/prisma";
import { isAdminByPrefs } from "app/data/prismaRepo";
import { getSession } from "app/auth";
import { Prisma } from "@prisma/client";

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
