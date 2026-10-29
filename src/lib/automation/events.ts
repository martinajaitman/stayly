import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { IncidentCategory, IncidentPriority, IncidentStatus, PropertyStatus, ReservationStatus } from "@/lib/types";
import { DEFAULT_CLEANING_CHECKLIST, derivePropertyStatus, isCheckoutDue } from "./status";

// Eventos del dominio: "el sistema operativo de la estadía".
// Corren con service role porque cruzan permisos (un huésped o una persona de
// limpieza no pueden modificar la propiedad). Quien los llama ya validó el acceso.

/** Recalcula el estado de la propiedad a partir de su situación real. */
export async function refreshPropertyStatus(propertyId: string): Promise<PropertyStatus> {
  const db = createAdminClient();
  const [{ data: property }, guests, cleanings, urgent] = await Promise.all([
    db.from("properties").select("status").eq("id", propertyId).single(),
    db.from("reservations").select("id", { count: "exact", head: true }).eq("property_id", propertyId).eq("status", "checked_in"),
    db.from("tasks").select("id", { count: "exact", head: true }).eq("property_id", propertyId).eq("type", "cleaning").neq("status", "done"),
    db.from("incidents").select("id", { count: "exact", head: true }).eq("property_id", propertyId).eq("priority", "high").neq("status", "resolved"),
  ]);
  if (!property) throw new Error("Propiedad no encontrada");

  const status = derivePropertyStatus({
    current: property.status as PropertyStatus,
    guestInside: (guests.count ?? 0) > 0,
    openCleaning: (cleanings.count ?? 0) > 0,
    urgentIncident: (urgent.count ?? 0) > 0,
  });
  if (status !== property.status) {
    await db.from("properties").update({ status }).eq("id", propertyId);
  }
  return status;
}

export async function checkIn(reservationId: string) {
  const db = createAdminClient();
  const { data: r, error } = await db
    .from("reservations")
    .update({ status: "checked_in", checked_in_at: new Date().toISOString() })
    .eq("id", reservationId)
    .in("status", ["confirmed", "checked_in"])
    .select("property_id")
    .single();
  if (error || !r) throw new Error("No se pudo registrar el check-in");
  await refreshPropertyStatus(r.property_id);
}

/** Cierra la estadía y genera la limpieza para el próximo huésped. */
export async function checkOut(reservationId: string, at: Date = new Date()) {
  const db = createAdminClient();
  const { data: r, error } = await db
    .from("reservations")
    .update({ status: "checked_out", checked_out_at: at.toISOString() })
    .eq("id", reservationId)
    .in("status", ["confirmed", "checked_in"])
    .select("organization_id, property_id, properties(default_cleaner_id)")
    .single();
  if (error || !r) throw new Error("No se pudo registrar el check-out");

  const { count } = await db
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("reservation_id", reservationId)
    .eq("type", "cleaning");
  if (!count) {
    const property = r.properties as unknown as { default_cleaner_id: string | null } | null;
    await db.from("tasks").insert({
      organization_id: r.organization_id,
      type: "cleaning",
      property_id: r.property_id,
      reservation_id: reservationId,
      assigned_to: property?.default_cleaner_id ?? null,
      scheduled_for: new Date(at.getTime() + 30 * 60000).toISOString(),
      checklist: DEFAULT_CLEANING_CHECKLIST,
    });
  }
  await refreshPropertyStatus(r.property_id);
}

export interface NewIncident {
  organizationId: string;
  propertyId: string;
  reservationId?: string | null;
  category: IncidentCategory;
  priority: IncidentPriority;
  title: string;
  description?: string;
  reportedBy: "guest" | "admin" | "staff" | "ai";
  assignedTo?: string | null;
}

export async function createIncident(i: NewIncident): Promise<{ id: string; number: number }> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("incidents")
    .insert({
      organization_id: i.organizationId,
      property_id: i.propertyId,
      reservation_id: i.reservationId ?? null,
      category: i.category,
      priority: i.priority,
      title: i.title,
      description: i.description ?? "",
      reported_by: i.reportedBy,
      assigned_to: i.assignedTo ?? null,
      status: i.assignedTo ? "assigned" : "pending",
    })
    .select("id, number")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear la incidencia");
  await refreshPropertyStatus(i.propertyId);
  return data;
}

export async function updateIncident(
  incidentId: string,
  changes: { status?: IncidentStatus; assignedTo?: string | null; priority?: IncidentPriority },
) {
  const db = createAdminClient();
  const update: Record<string, unknown> = {};
  if (changes.priority) update.priority = changes.priority;
  if (changes.assignedTo !== undefined) {
    update.assigned_to = changes.assignedTo;
    // Asignar a alguien una incidencia pendiente la pasa a "Asignada".
    if (changes.assignedTo && !changes.status) update.status = "assigned";
  }
  if (changes.status) update.status = changes.status;
  if (update.status) update.resolved_at = update.status === "resolved" ? new Date().toISOString() : null;

  const { data, error } = await db.from("incidents").update(update).eq("id", incidentId).select("property_id").single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo actualizar la incidencia");
  await refreshPropertyStatus(data.property_id);
}

export async function setTaskStatus(taskId: string, status: "pending" | "in_progress" | "done") {
  const db = createAdminClient();
  const now = new Date().toISOString();
  const update: Record<string, unknown> = { status };
  if (status === "in_progress") update.started_at = now;
  if (status === "done") update.completed_at = now;
  if (status === "pending") Object.assign(update, { started_at: null, completed_at: null });

  const { data, error } = await db.from("tasks").update(update).eq("id", taskId).select("property_id").single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo actualizar la tarea");
  await refreshPropertyStatus(data.property_id);
}

/**
 * Cierra las estadías cuyo check-out ya pasó y nadie marcó (típico de huéspedes
 * de Airbnb/Booking que nunca abren el portal). Corre en el cron y al abrir el dashboard.
 */
export async function processDueCheckouts(organizationId?: string, now: Date = new Date()): Promise<number> {
  const db = createAdminClient();
  let query = db
    .from("reservations")
    .select("id, status, check_out_at")
    .in("status", ["confirmed", "checked_in"])
    .lt("check_out_at", now.toISOString());
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data } = await query;

  const due = (data ?? []).filter((r) =>
    isCheckoutDue(r as { status: ReservationStatus; check_out_at: string }, now),
  );
  for (const r of due) {
    await checkOut(r.id, new Date(r.check_out_at));
  }
  return due.length;
}
