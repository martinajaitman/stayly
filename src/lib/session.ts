import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Organization, Profile } from "@/lib/types";

/** Usuario logueado + perfil + organización. Redirige a /login si no hay sesión. */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, organization_id, full_name, phone, role, organizations(id, name, timezone)")
    .eq("id", userId)
    .single();
  if (!profile) redirect("/login?error=sin-perfil");

  const { organizations, ...rest } = profile as unknown as Profile & { organizations: Organization };
  return { supabase, profile: rest as Profile, org: organizations };
});

export async function requireAdmin() {
  const session = await getSession();
  if (session.profile.role !== "admin") redirect("/today");
  return session;
}
