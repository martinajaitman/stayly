import type { SupabaseClient } from "@supabase/supabase-js";
import { ROLE_LABEL, type UserRole } from "@/lib/types";

/** Personas que pueden recibir limpiezas: personal de limpieza primero, después el resto. */
export async function getCleaners(supabase: SupabaseClient) {
  const { data } = await supabase.from("profiles").select("id, full_name, role").order("full_name");
  const rows = (data ?? []) as { id: string; full_name: string; role: UserRole }[];
  return rows
    .sort((a, b) => Number(b.role === "cleaner") - Number(a.role === "cleaner"))
    .map((p) => ({ id: p.id, name: `${p.full_name || "Sin nombre"} (${ROLE_LABEL[p.role]})` }));
}
