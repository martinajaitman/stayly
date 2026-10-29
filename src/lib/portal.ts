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

export interface GuestIncident {
  id: string;
  number: number;
  title: string;
  status: string;
  visit_at: string | null;
  professional: string | null;
  slots: string[];
}

/** Reportes del huésped con el estado del técnico (para su página web). */
export async function getGuestIncidents(reservationId: string): Promise<GuestIncident[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("incidents")
    .select("id, number, title, status, visit_at, resolved_at, quotes!incidents_selected_quote_fk(proposed_slots, profiles(full_name))")
    .eq("reservation_id", reservationId)
    .order("created_at", { ascending: false });
  const now = Date.now();
  return ((data ?? []) as unknown as {
    id: string; number: number; title: string; status: string; visit_at: string | null; resolved_at: string | null;
    quotes: { proposed_slots: string[]; profiles: { full_name: string } | null } | null;
  }[])
    // Los resueltos se muestran un día más y después desaparecen.
    .filter((i) => i.status !== "resolved" || (i.resolved_at && now - new Date(i.resolved_at).getTime() < 86400000))
    .map((i) => {
      const [first, last] = (i.quotes?.profiles?.full_name ?? "").split(" ");
      return {
        id: i.id,
        number: i.number,
        title: i.title,
        status: i.status,
        visit_at: i.visit_at,
        professional: first ? `${first}${last ? ` ${last[0]}.` : ""}` : null,
        slots: (i.quotes?.proposed_slots ?? []).filter((s) => new Date(s).getTime() > now),
      };
    });
}
