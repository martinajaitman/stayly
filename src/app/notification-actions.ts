"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

export async function markNotificationsRead(ids: string[]) {
  const { supabase, profile } = await getSession();
  if (ids.length === 0) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids).eq("profile_id", profile.id);
  revalidatePath("/", "layout");
}
