"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createIncident, setTaskStatus, updateIncident } from "@/lib/automation/events";
import { requireAdmin } from "@/lib/session";
import type { IncidentStatus, TaskStatus } from "@/lib/types";

export type FormState = { error?: string; ok?: string } | undefined;

// requireAdmin + select con el cliente de usuario: la RLS confirma que es de su organización.
async function ownTask(id: string) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("tasks").select("id").eq("id", id).single();
  if (!data) throw new Error("Tarea no encontrada");
  return supabase;
}
async function ownIncident(id: string) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("incidents").select("id").eq("id", id).single();
  if (!data) throw new Error("Incidencia no encontrada");
}

const refresh = () => {
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
};

export async function assignTask(taskId: string, assignee: string) {
  const supabase = await ownTask(taskId);
  await supabase.from("tasks").update({ assigned_to: assignee || null }).eq("id", taskId);
  refresh();
}

export async function moveTask(taskId: string, status: TaskStatus) {
  await ownTask(taskId);
  await setTaskStatus(taskId, status);
  refresh();
}

export async function assignIncident(incidentId: string, assignee: string) {
  await ownIncident(incidentId);
  await updateIncident(incidentId, { assignedTo: assignee || null });
  refresh();
}

export async function moveIncident(incidentId: string, status: IncidentStatus) {
  await ownIncident(incidentId);
  await updateIncident(incidentId, { status });
  refresh();
}

const incidentSchema = z.object({
  property_id: z.guid("Elegí una propiedad"),
  category: z.enum(["maintenance", "cleaning", "access", "amenities", "noise", "other"]),
  priority: z.enum(["low", "medium", "high"]),
  title: z.string().trim().min(3, "Poné un título"),
  description: z.string().trim(),
  assigned_to: z.string().transform((v) => v || null),
  service: z.enum(["plumbing", "electricity", "gas", "air", "locksmith", "appliances", "internet", "general", ""]).transform((v) => v || null),
  budget_cap: z.string().transform((v) => v.replace(/[^\d]/g, "")).transform((v) => (v ? Number(v) : null)),
});

export async function createIncidentAdmin(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase, org } = await requireAdmin();
  const parsed = incidentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { data: property } = await supabase.from("properties").select("id").eq("id", parsed.data.property_id).single();
  if (!property) return { error: "Propiedad no encontrada" };

  const { number } = await createIncident({
    organizationId: org.id,
    propertyId: parsed.data.property_id,
    category: parsed.data.category,
    priority: parsed.data.priority,
    title: parsed.data.title,
    description: parsed.data.description,
    reportedBy: "admin",
    assignedTo: parsed.data.assigned_to,
    service: parsed.data.service,
    budgetCap: parsed.data.budget_cap,
  });
  refresh();
  return { ok: parsed.data.service && !parsed.data.assigned_to ? `Incidencia #${number} creada. Ya pedimos presupuestos.` : `Incidencia #${number} creada.` };
}
