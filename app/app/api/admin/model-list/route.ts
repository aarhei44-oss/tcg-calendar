// /app/app/api/admin/model-list/route.ts
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export async function GET() {
  const models = Prisma.dmmf.datamodel.models.map((m) => m.name);
  return NextResponse.json({ models });
}
