"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { extractDocumentFields, type DocumentData } from "@/lib/ai/document";
import { checkIn, checkOut, createIncident } from "@/lib/automation/events";
import { scheduleVisit } from "@/lib/automation/maintenance";
import { getPortalReservation, isArrivalDay } from "@/lib/portal";
import { uploadImage } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import type { IncidentCategory } from "@/lib/types";

export type PortalState = { error?: string } | undefined;

const optional = z.string().trim().transform((v) => v || null);

const registrationSchema = z.object({
  full_name: z.string().trim().min(3, "Completá tu nombre y apellido"),
  document_type: z.enum(["DNI", "Pasaporte", "Otro"]),
  document_number: z.string().trim().min(4, "Completá el número de documento"),
  nationality: z.string().trim().min(2, "Completá tu nacionalidad"),
  phone: optional,
  email: optional,
  signature: z.string().trim().min(3, "Escribí tu nombre para firmar"),
  accept_rules: z.literal("on", { message: "Tenés que aceptar las normas de la casa" }),
});

export async function registerGuest(token: string, _: PortalState, formData: FormData): Promise<PortalState> {
  const r = await getPortalReservation(token);
  if (!r) return { error: "La reserva no existe o fue cancelada." };
  if (r.status === "checked_out") return { error: "Esta estadía ya terminó." };

  const parsed = registrationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { full_name, document_type, document_number, nationality, phone, email } = parsed.data;
  const guest = { full_name, document_type, document_number, nationality, phone, email };

  const db = createAdminClient();
  const photo = formData.get("document_photo");
  let documentPath: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    try {
      documentPath = await uploadImage("guest-documents", `${r.organization_id}/${r.id}`, photo);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "No se pudo subir la foto" };
    }
  } else if (!r.guests?.document_image_path) {
    return { error: "Sacale una foto a tu documento" };
  }

  const values = { ...guest, ...(documentPath ? { document_image_path: documentPath } : {}) };
  if (r.guest_id) {
    const { error } = await db.from("guests").update(values).eq("id", r.guest_id);
    if (error) return { error: "No pudimos guardar tus datos. Probá de nuevo." };
  } else {
    const { data: g, error } = await db
      .from("guests")
      .insert({ ...values, organization_id: r.organization_id })
      .select("id")
      .single();
    if (error || !g) return { error: "No pudimos guardar tus datos. Probá de nuevo." };
    await db.from("reservations").update({ guest_id: g.id }).eq("id", r.id);
  }

  await db.from("reservations").update({ rules_accepted_at: new Date().toISOString() }).eq("id", r.id);
  if (isArrivalDay(r)) await checkIn(r.id);

  revalidatePath(`/stay/${token}`);
  redirect(`/stay/${token}`);
}

export async function confirmArrival(token: string) {
  const r = await getPortalReservation(token);
  if (!r || !r.rules_accepted_at || !isArrivalDay(r) || r.status !== "confirmed") return;
  await checkIn(r.id);
  revalidatePath(`/stay/${token}`);
}

const CATEGORY_TITLE: Record<IncidentCategory, string> = {
  maintenance: "Algo no funciona",
  cleaning: "Problema de limpieza",
  access: "Problema con el acceso",
  amenities: "Faltan amenities",
  noise: "Ruidos o vecinos",
  other: "Consulta del huésped",
};

const reportSchema = z.object({
  category: z.enum(["maintenance", "cleaning", "access", "amenities", "noise", "other"]),
  description: z.string().trim().min(5, "Contanos un poco más qué pasa"),
  urgent: z.string().optional(),
  service: z.enum(["plumbing", "electricity", "gas", "air", "locksmith", "appliances", "internet", "general", ""]).optional(),
});

export async function reportProblem(token: string, _: PortalState, formData: FormData): Promise<PortalState> {
  const r = await getPortalReservation(token);
  if (!r || r.status === "checked_out") return { error: "No se puede reportar en esta reserva." };
  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { number } = await createIncident({
    organizationId: r.organization_id,
    propertyId: r.property_id,
    reservationId: r.id,
    category: parsed.data.category,
    priority: parsed.data.urgent === "on" ? "high" : "medium",
    title: CATEGORY_TITLE[parsed.data.category],
    description: parsed.data.description,
    reportedBy: "guest",
    service: parsed.data.category === "maintenance" || parsed.data.category === "access" ? parsed.data.service || "general" : null,
  });
  redirect(`/stay/${token}?reported=${number}`);
}

export async function guestCheckout(token: string, _: PortalState, formData: FormData): Promise<PortalState> {
  const r = await getPortalReservation(token);
  if (!r || r.status !== "checked_in") return { error: "El check-out no está disponible para esta reserva." };

  const comment = String(formData.get("comment") ?? "").trim();
  if (comment) {
    await createIncident({
      organizationId: r.organization_id,
      propertyId: r.property_id,
      reservationId: r.id,
      category: "other",
      priority: "medium",
      title: "Reporte al hacer check-out",
      description: comment,
      reportedBy: "guest",
    });
  }
  await checkOut(r.id);
  revalidatePath(`/stay/${token}`);
  redirect(`/stay/${token}`);
}

/** Lee la foto del documento con IA para autocompletar el check-in. */
export async function readDocument(token: string, formData: FormData): Promise<DocumentData | null> {
  const r = await getPortalReservation(token);
  if (!r || r.status !== "confirmed") return null;
  const photo = formData.get("document_photo");
  if (!(photo instanceof File) || photo.size === 0 || photo.size > 4 * 1024 * 1024) return null;
  return extractDocumentFields(photo);
}

export async function pickVisitSlot(token: string, incidentId: string, formData: FormData) {
  const r = await getPortalReservation(token);
  if (!r) return;
  const { data: incident } = await createAdminClient().from("incidents").select("reservation_id").eq("id", incidentId).single();
  if (incident?.reservation_id !== r.id) return;
  await scheduleVisit(incidentId, String(formData.get("slot") ?? ""), "guest");
  revalidatePath(`/stay/${token}`);
}
