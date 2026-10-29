"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { updateIncident } from "@/lib/automation/events";
import { resolveVisit, submitQuote } from "@/lib/automation/maintenance";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

async function requirePro() {
  const session = await getSession();
  if (session.profile.role !== "maintenance") redirect("/today");
  return session;
}

export type QuoteFormState = { error?: string } | undefined;

const amount = z
  .string()
  .transform((v) => v.replace(/[^\d]/g, ""))
  .transform((v) => (v ? Number(v) : null));

const quoteSchema = z.object({
  repair_amount: amount,
  replace_amount: amount,
  notes: z.string().trim().max(1000),
});

export async function sendQuote(incidentId: string, _: QuoteFormState, formData: FormData): Promise<QuoteFormState> {
  const { profile } = await requirePro();
  const parsed = quoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Revisá los montos" };
  const { repair_amount, replace_amount, notes } = parsed.data;
  if (!repair_amount && !replace_amount) return { error: "Poné al menos un precio: arreglar o reemplazar" };
  const slots = formData
    .getAll("slot")
    .map(String)
    .filter((s) => !Number.isNaN(Date.parse(s)) && Date.parse(s) > Date.now());
  if (slots.length === 0) return { error: "Elegí al menos un horario en el que podés ir" };

  try {
    await submitQuote(incidentId, profile.id, { repairAmount: repair_amount, replaceAmount: replace_amount, notes, proposedSlots: slots.slice(0, 6) });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo enviar el presupuesto" };
  }
  revalidatePath("/today");
  redirect("/today?sent=1");
}

export async function saveAvailability(formData: FormData) {
  const { profile, org } = await requirePro();
  const rows = formData
    .getAll("cell")
    .map(String)
    .map((c) => c.split(":"))
    .filter(([d, s]) => /^[0-6]$/.test(d) && (s === "morning" || s === "afternoon"))
    .map(([d, s]) => ({ profile_id: profile.id, organization_id: org.id, weekday: Number(d), slot: s }));
  const db = createAdminClient();
  await db.from("professional_availability").delete().eq("profile_id", profile.id);
  if (rows.length) await db.from("professional_availability").insert(rows);
  revalidatePath("/today/availability");
  redirect("/today/availability?saved=1");
}

async function ownVisit(incidentId: string) {
  const { supabase, profile } = await requirePro();
  // RLS: solo ve incidencias asignadas a él.
  const { data } = await supabase.from("incidents").select("id, status").eq("id", incidentId).eq("assigned_to", profile.id).single();
  if (!data) throw new Error("Visita no encontrada");
  return data;
}

export async function startVisit(incidentId: string) {
  await ownVisit(incidentId);
  await updateIncident(incidentId, { status: "in_progress" });
  revalidatePath(`/today/visits/${incidentId}`);
}

export async function finishVisit(incidentId: string, formData: FormData) {
  await ownVisit(incidentId);
  await resolveVisit(incidentId, String(formData.get("notes") ?? "").trim().slice(0, 1000));
  revalidatePath("/today");
  redirect(`/today/visits/${incidentId}`);
}
