"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkIn, checkOut } from "@/lib/automation/events";
import { requireAdmin } from "@/lib/session";
import { zonedToUtc } from "@/lib/time";

export type FormState = { error?: string; ok?: string } | undefined;

const guestSchema = z.object({
  full_name: z.string().trim(),
  phone: z.string().trim().transform((v) => v || null),
  email: z.string().trim().transform((v) => v || null),
});

const reservationSchema = z
  .object({
    property_id: z.guid("Elegí una propiedad"),
    channel: z.enum(["airbnb", "booking", "direct", "other"]),
    check_in_day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de llegada inválida"),
    check_out_day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de salida inválida"),
    guests_count: z.coerce.number().int().min(1),
    confirmation_code: z.string().trim().transform((v) => v || null),
    notes: z.string().trim(),
  })
  .refine((r) => r.check_out_day > r.check_in_day, { message: "La salida tiene que ser posterior a la llegada" });

export async function createReservation(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase, org } = await requireAdmin();
  const data = Object.fromEntries(formData);
  const parsed = reservationSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const guest = guestSchema.parse(data);
  const { check_in_day, check_out_day, ...r } = parsed.data;

  const { data: property } = await supabase
    .from("properties")
    .select("checkin_time, checkout_time")
    .eq("id", r.property_id)
    .single();
  if (!property) return { error: "Propiedad no encontrada" };

  let guestId: string | null = null;
  if (guest.full_name || guest.phone || guest.email) {
    const { data: g, error } = await supabase
      .from("guests")
      .insert({ ...guest, organization_id: org.id })
      .select("id")
      .single();
    if (error) return { error: error.message };
    guestId = g.id;
  }

  const { data: created, error } = await supabase
    .from("reservations")
    .insert({
      ...r,
      organization_id: org.id,
      guest_id: guestId,
      check_in_at: zonedToUtc(check_in_day, property.checkin_time.slice(0, 5), org.timezone).toISOString(),
      check_out_at: zonedToUtc(check_out_day, property.checkout_time.slice(0, 5), org.timezone).toISOString(),
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  redirect(`/reservations/${created.id}`);
}

/** Completa el contacto del huésped: clave para reservas importadas por iCal, que no lo traen. */
export async function saveGuest(reservationId: string, _: FormState, formData: FormData): Promise<FormState> {
  const { supabase, org } = await requireAdmin();
  const guest = guestSchema.parse(Object.fromEntries(formData));
  if (!guest.full_name) return { error: "El nombre es obligatorio" };

  const { data: reservation } = await supabase.from("reservations").select("guest_id").eq("id", reservationId).single();
  if (!reservation) return { error: "Reserva no encontrada" };

  if (reservation.guest_id) {
    const { error } = await supabase.from("guests").update(guest).eq("id", reservation.guest_id);
    if (error) return { error: error.message };
  } else {
    const { data: g, error } = await supabase
      .from("guests")
      .insert({ ...guest, organization_id: org.id })
      .select("id")
      .single();
    if (error) return { error: error.message };
    await supabase.from("reservations").update({ guest_id: g.id }).eq("id", reservationId);
  }
  revalidatePath(`/reservations/${reservationId}`);
  return { ok: "Huésped guardado." };
}

export async function updateReservationTimes(reservationId: string, _: FormState, formData: FormData): Promise<FormState> {
  const { supabase, org } = await requireAdmin();
  const v = z
    .object({
      check_in_day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      check_in_time: z.string().regex(/^\d{2}:\d{2}$/),
      check_out_day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      check_out_time: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .safeParse(Object.fromEntries(formData));
  if (!v.success) return { error: "Fechas inválidas" };
  const checkIn = zonedToUtc(v.data.check_in_day, v.data.check_in_time, org.timezone);
  const checkOut = zonedToUtc(v.data.check_out_day, v.data.check_out_time, org.timezone);
  if (checkOut <= checkIn) return { error: "La salida tiene que ser posterior a la llegada" };

  const { error } = await supabase
    .from("reservations")
    .update({ check_in_at: checkIn.toISOString(), check_out_at: checkOut.toISOString() })
    .eq("id", reservationId);
  if (error) return { error: error.message };
  revalidatePath(`/reservations/${reservationId}`);
  return { ok: "Horarios actualizados." };
}

export async function setReservationStatus(reservationId: string, status: "confirmed" | "cancelled") {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("reservations").update({ status }).eq("id", reservationId);
  if (error) throw new Error(error.message);
  revalidatePath(`/reservations/${reservationId}`);
}

async function ownReservation(reservationId: string) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("reservations").select("id").eq("id", reservationId).single();
  if (!data) throw new Error("Reserva no encontrada");
}

export async function markCheckIn(reservationId: string) {
  await ownReservation(reservationId);
  await checkIn(reservationId);
  revalidatePath(`/reservations/${reservationId}`);
}

export async function markCheckOut(reservationId: string) {
  await ownReservation(reservationId);
  await checkOut(reservationId);
  revalidatePath(`/reservations/${reservationId}`);
}
