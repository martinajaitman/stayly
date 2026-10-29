"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";

export type SettingsState = { error?: string; ok?: string } | undefined;

const money = (v: FormDataEntryValue | null) => Number(String(v ?? "").replace(/[^\d]/g, "") || 0);

export async function saveSettings(_: SettingsState, formData: FormData): Promise<SettingsState> {
  const { supabase, org } = await requireAdmin();
  const window = Number(formData.get("quote_window_minutes"));
  if (!Number.isInteger(window) || window < 5 || window > 2880) return { error: "El plazo tiene que estar entre 5 minutos y 48 horas" };
  const { error } = await supabase
    .from("organizations")
    .update({
      name: String(formData.get("name") ?? "").trim() || org.name,
      monthly_incident_fund: money(formData.get("monthly_incident_fund")),
      default_incident_cap: money(formData.get("default_incident_cap")),
      quote_window_minutes: window,
    })
    .eq("id", org.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: "Configuración guardada." };
}
