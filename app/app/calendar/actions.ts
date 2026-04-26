// /app/app/calendar/actions.ts
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "../auth";
import { setUserSubscription, addEventComment, deleteCommentIfAllowed } from "../../data/admin/adminRepo";

export async function subscribeAction(formData: FormData) {
  "use server";
  const session = await getSession();
  const userId = session?.user?.id ?? null;

  if (!userId) {
    redirect("/calendar?ok=0&msg=not%20signed%20in");
  }

  const installId = String(formData.get("installId") ?? "");
  const subscribe = String(formData.get("subscribe") ?? "") === "true";

  if (!installId) {
    redirect("/calendar?ok=0&msg=missing%20installId");
  }

  await setUserSubscription(userId!, installId, subscribe);
  revalidatePath("/calendar");
  redirect("/calendar?ok=1");
}

export async function commentAction(formData: FormData) {
  "use server";
  const session = await getSession();
  const userId = session?.user?.id ?? null;

  if (!userId) {
    redirect("/calendar?ok=0&msg=not%20signed%20in");
  }

  const eventId = String(formData.get("eventId") ?? "");
  const content = String(formData.get("content") ?? "").trim();

  if (!eventId) {
    redirect("/calendar?ok=0&msg=missing%20eventId");
  }
  if (!content) {
    redirect("/calendar?ok=0&msg=empty%20comment");
  }

  await addEventComment(eventId, userId!, content);
  revalidatePath("/calendar");
  redirect("/calendar?ok=1");
}

export async function deleteCommentAction(formData: FormData) {
  "use server";
  const session = await getSession();
  const userId = session?.user?.id ?? null;

  if (!userId) {
    redirect("/calendar?ok=0&msg=not%20signed%20in");
  }

  const commentId = String(formData.get("commentId") ?? "");
  if (!commentId) {
    redirect("/calendar?ok=0&msg=missing%20commentId");
  }

  await deleteCommentIfAllowed(commentId, userId!);

  revalidatePath("/calendar");
  // No headers() in this context, so just redirect to calendar
  redirect("/calendar?ok=1");
}
