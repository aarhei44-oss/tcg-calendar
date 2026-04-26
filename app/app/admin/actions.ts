// /app/app/admin/actions.ts
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureAdmin } from "./db/actions";
import { absUrl } from "./db/actions";

export async function toggleInstallEnabled(formData: FormData) {
  "use server";
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
  "use server";
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
