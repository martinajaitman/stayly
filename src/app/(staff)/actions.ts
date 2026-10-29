"use server";

import { revalidatePath } from "next/cache";
import { createIncident, setTaskStatus, updateIncident } from "@/lib/automation/events";
import { getSession } from "@/lib/session";
import { uploadImage } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChecklistItem } from "@/lib/types";

/** La RLS del cliente de usuario garantiza que la tarea sea propia (o que sea admin). */
async function getOwnTask(taskId: string) {
  const { supabase } = await getSession();
  const { data } = await supabase
    .from("tasks")
    .select("id, organization_id, property_id, reservation_id, checklist, photos, status")
    .eq("id", taskId)
    .single();
  if (!data) throw new Error("Tarea no encontrada");
  return { supabase, task: data as { id: string; organization_id: string; property_id: string; reservation_id: string | null; checklist: ChecklistItem[]; photos: string[]; status: string } };
}

const refresh = (taskId: string) => {
  revalidatePath("/today");
  revalidatePath(`/today/${taskId}`);
};

export async function startTask(taskId: string) {
  await getOwnTask(taskId);
  await setTaskStatus(taskId, "in_progress");
  refresh(taskId);
}

export async function finishTask(taskId: string) {
  await getOwnTask(taskId);
  await setTaskStatus(taskId, "done");
  refresh(taskId);
}

export async function toggleChecklistItem(taskId: string, index: number, done: boolean) {
  const { supabase, task } = await getOwnTask(taskId);
  const checklist = task.checklist.map((item, i) => (i === index ? { ...item, done } : item));
  const { error } = await supabase.from("tasks").update({ checklist }).eq("id", taskId);
  if (error) throw new Error(error.message);
  refresh(taskId);
}

export async function addTaskPhoto(taskId: string, formData: FormData): Promise<{ error?: string }> {
  const { task } = await getOwnTask(taskId);
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return { error: "Elegí una foto" };
  try {
    const path = await uploadImage("task-photos", `${task.organization_id}/${task.id}`, photo);
    await createAdminClient().from("tasks").update({ photos: [...task.photos, path] }).eq("id", taskId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo subir la foto" };
  }
  refresh(taskId);
  return {};
}

export async function saveTaskNotes(taskId: string, formData: FormData): Promise<{ ok?: string; error?: string }> {
  const { supabase, task } = await getOwnTask(taskId);
  const notes = String(formData.get("notes") ?? "").trim();
  const damage = String(formData.get("damage") ?? "").trim();
  await supabase.from("tasks").update({ notes }).eq("id", taskId);
  if (damage) {
    const { number } = await createIncident({
      organizationId: task.organization_id,
      propertyId: task.property_id,
      reservationId: task.reservation_id,
      category: "maintenance",
      priority: formData.get("urgent") === "on" ? "high" : "medium",
      title: "Daño encontrado en la limpieza",
      description: damage,
      reportedBy: "staff",
    });
    refresh(taskId);
    return { ok: `Guardado. Se creó la incidencia #${number}.` };
  }
  refresh(taskId);
  return { ok: "Observaciones guardadas." };
}

export async function setMyIncidentStatus(incidentId: string, status: "in_progress" | "resolved") {
  const { supabase } = await getSession();
  const { data } = await supabase.from("incidents").select("id").eq("id", incidentId).single();
  if (!data) throw new Error("Incidencia no encontrada");
  await updateIncident(incidentId, { status });
  revalidatePath("/today");
}
