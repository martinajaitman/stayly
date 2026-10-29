import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { toZonedDay } from "@/lib/time";
import type { Guest, Property, Reservation } from "@/lib/types";

export type PortalData = Reservation & {
  properties: Property;
  guests: Guest | null;
  organizations: { name: string; timezone: string };
};

/** Reserva del portal del huésped. El token es la única credencial: no hay login. */
export const getPortalReservation = cache(async (token: string): Promise<PortalData | null> => {
  if (!/^[\w-]{6,64}$/.test(token)) return null;
  const { data } = await createAdminClient()
    .from("reservations")
    .select("*, properties(*), guests(*), organizations(name, timezone)")
    .eq("portal_token", token)
    .neq("status", "cancelled")
    .maybeSingle();
  return (data as PortalData | null) ?? null;
});

/** ¿Ya es el día de llegada (o después) en la zona horaria de la organización? */
export function isArrivalDay(r: PortalData, now: Date = new Date()): boolean {
  const tz = r.organizations.timezone;
  return toZonedDay(now, tz) >= toZonedDay(new Date(r.check_in_at), tz);
}
