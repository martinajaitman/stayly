import { addDays, toZonedDay, zonedToUtc } from "@/lib/time";

export type DaySlot = "morning" | "afternoon";
export const SLOT_TIME: Record<DaySlot, string> = { morning: "10:00", afternoon: "17:00" };
export const SLOT_LABEL: Record<DaySlot, string> = { morning: "Mañana (10 a 12 h)", afternoon: "Tarde (17 a 19 h)" };

/**
 * Próximos turnos posibles según la disponibilidad semanal del profesional
 * (0 = domingo). Si no cargó disponibilidad, ofrece todos los días hábiles.
 */
export function candidateSlots(
  availability: { weekday: number; slot: DaySlot }[],
  timeZone: string,
  now: Date = new Date(),
  days = 7,
): { iso: string; day: string; slot: DaySlot }[] {
  const available = availability.length
    ? new Set(availability.map((a) => `${a.weekday}:${a.slot}`))
    : new Set([1, 2, 3, 4, 5].flatMap((d) => [`${d}:morning`, `${d}:afternoon`]));
  const today = toZonedDay(now, timeZone);
  const out: { iso: string; day: string; slot: DaySlot }[] = [];
  for (let i = 0; i <= days; i++) {
    const day = addDays(today, i);
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    for (const slot of ["morning", "afternoon"] as const) {
      if (!available.has(`${weekday}:${slot}`)) continue;
      const at = zonedToUtc(day, SLOT_TIME[slot], timeZone);
      if (at.getTime() - now.getTime() < 60 * 60000) continue; // al menos 1 h de anticipación
      out.push({ iso: at.toISOString(), day, slot });
    }
  }
  return out;
}

export function formatSlot(iso: string, timeZone: string) {
  const s = new Intl.DateTimeFormat("es-AR", { timeZone, weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}
