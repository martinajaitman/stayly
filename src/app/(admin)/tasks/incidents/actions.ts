"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { approveQuote, closeQuotingIfReady, scheduleVisit, startQuoting } from "@/lib/automation/maintenance";
import { requireAdmin } from "@/lib/session";

async function ownIncident(id: string) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("incidents").select("id").eq("id", id).single();
  if (!data) throw new Error("Incidencia no encontrada");
  return supabase;
}

const refresh = (id: string) => {
  revalidatePath(`/tasks/incidents/${id}`);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
};

export type ActionState = { error?: string; ok?: string } | undefined;

export async function updateBudget(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await ownIncident(id);
  const raw = String(formData.get("budget_cap") ?? "").replace(/[^\d]/g, "");
  const service = String(formData.get("service") ?? "") || null;
  const parsedService = z.enum(["plumbing", "electricity", "gas", "air", "locksmith", "appliances", "internet", "general"]).nullable().safeParse(service);
  if (!parsedService.success) return { error: "Rubro inválido" };
  await supabase.from("incidents").update({ budget_cap: raw ? Number(raw) : null, service: parsedService.data }).eq("id", id);
  refresh(id);
  return { ok: "Guardado." };
}

export async function requestQuotes(id: string) {
  await ownIncident(id);
  await startQuoting(id);
  refresh(id);
}

export async function closeQuotingNow(id: string) {
  await ownIncident(id);
  await closeQuotingIfReady(id, true);
  refresh(id);
}

export async function approve(id: string, quoteId: string, resolution: "repair" | "replace") {
  await ownIncident(id);
  await approveQuote(id, quoteId, resolution);
  refresh(id);
}

export async function scheduleByAdmin(id: string, formData: FormData) {
  await ownIncident(id);
  await scheduleVisit(id, String(formData.get("slot") ?? ""), "admin");
  refresh(id);
}
