import type { PropertyStatus, ReservationStatus } from "@/lib/types";

export interface PropertySituation {
  current: PropertyStatus;
  /** Hay una reserva con el huésped adentro (check-in hecho, sin check-out). */
  guestInside: boolean;
  /** Hay una limpieza sin terminar. */
  openCleaning: boolean;
  /** Hay una incidencia de prioridad alta sin resolver. */
  urgentIncident: boolean;
}

/**
 * Estado de la propiedad según su situación real. Prioridad:
 * mantenimiento urgente > ocupada > en limpieza > lista/disponible.
 * Al quedar libre después de una limpieza o un arreglo pasa a "Lista";
 * si ya estaba libre conserva su estado.
 */
export function derivePropertyStatus(s: PropertySituation): PropertyStatus {
  if (s.urgentIncident) return "maintenance";
  if (s.guestInside) return "occupied";
  if (s.openCleaning) return "cleaning";
  return s.current === "available" || s.current === "ready" ? s.current : "ready";
}

/** Reservas cuyo check-out ya pasó (con margen) y nadie cerró. */
export function isCheckoutDue(
  r: { status: ReservationStatus; check_out_at: string },
  now: Date,
  graceMinutes = 60,
): boolean {
  if (r.status !== "confirmed" && r.status !== "checked_in") return false;
  return new Date(r.check_out_at).getTime() + graceMinutes * 60000 <= now.getTime();
}

export const DEFAULT_CLEANING_CHECKLIST = [
  "Cambiar sábanas y toallas",
  "Limpiar baño",
  "Limpiar cocina y vajilla",
  "Aspirar y trapear pisos",
  "Reponer amenities (papel, jabón, café)",
  "Sacar la basura",
  "Revisar daños o faltantes",
  "Ventilar y dejar luces y aire apagados",
].map((label) => ({ label, done: false }));
