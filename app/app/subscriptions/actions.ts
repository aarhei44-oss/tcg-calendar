// /app/app/subscriptions/actions.ts
import { setUserSubscription } from "../../data/admin/adminRepo";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "../auth";

export async function toggleSubscription(formData: FormData) {
  "use server";
  const session = await getSession();
  const userId = session?.user?.id ?? null;

  if (!userId) {
    redirect("/subscriptions?ok=0&msg=not%20signed%20in");
  }

  const installId = String(formData.get("installId") ?? "");
  const subscribe = String(formData.get("subscribe") ?? "") === "true";
  if (!installId) {
    redirect("/subscriptions?ok=0&msg=missing%20installId");
  }

  await setUserSubscription(userId!, installId, subscribe);
  revalidatePath("/subscriptions");
  redirect("/subscriptions?ok=1");
}
