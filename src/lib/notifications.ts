import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface NewNotification {
  title: string;
  body?: string;
  link?: string;
}

/** Avisos dentro de la app (campana) para personas puntuales. */
export async function notify(organizationId: string, profileIds: string[], n: NewNotification) {
  if (profileIds.length === 0) return;
  await createAdminClient()
    .from("notifications")
    .insert(profileIds.map((profile_id) => ({ organization_id: organizationId, profile_id, title: n.title, body: n.body ?? "", link: n.link ?? null })));
}

/** Aviso a todos los administradores de la organización. */
export async function notifyAdmins(organizationId: string, n: NewNotification) {
  const { data } = await createAdminClient().from("profiles").select("id").eq("organization_id", organizationId).eq("role", "admin");
  await notify(organizationId, (data ?? []).map((p) => p.id), n);
}
