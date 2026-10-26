import type { BookingChannel, ReservationStatus } from "@/lib/types";
import { zonedToUtc } from "@/lib/time";
import { extractAirbnbDetails, isBlock, type IcalEvent } from "./parse";

export interface ExistingReservation {
  id: string;
  external_uid: string | null;
  channel: BookingChannel;
  check_in_at: string;
  check_out_at: string;
  status: ReservationStatus;
  confirmation_code: string | null;
}

export interface FeedResult {
  channel: BookingChannel;
  events: IcalEvent[];
}

export interface PropertyTimes {
  checkinTime: string; // HH:MM[:SS]
  checkoutTime: string;
  timeZone: string;
}

export interface ReservationInsert {
  external_uid: string;
  channel: BookingChannel;
  confirmation_code: string | null;
  check_in_at: string;
  check_out_at: string;
  notes: string;
}

export interface ReservationUpdate {
  id: string;
  check_in_at: string;
  check_out_at: string;
  status: ReservationStatus;
  confirmation_code: string | null;
}

export interface SyncPlan {
  inserts: ReservationInsert[];
  updates: ReservationUpdate[];
  cancellations: string[];
}

/**
 * Compara los eventos de los feeds iCal con las reservas ya guardadas de la
 * propiedad y decide qué crear, actualizar o cancelar. Función pura.
 *
 * Solo se cancelan reservas futuras de canales cuyo feed se pudo leer: si
 * un feed falló no hay que interpretar su ausencia como cancelación.
 */
export function planSync(
  existing: ExistingReservation[],
  feeds: FeedResult[],
  times: PropertyTimes,
  now: Date = new Date(),
): SyncPlan {
  const plan: SyncPlan = { inserts: [], updates: [], cancellations: [] };
  const byUid = new Map(existing.filter((r) => r.external_uid).map((r) => [r.external_uid!, r]));
  const seen = new Set<string>();

  for (const feed of feeds) {
    for (const event of feed.events) {
      if (isBlock(event, feed.channel)) continue;
      // Eventos ya terminados no aportan nada y evitan reescribir historial.
      const checkOut = zonedToUtc(event.endDay, times.checkoutTime.slice(0, 5), times.timeZone);
      if (checkOut <= now) continue;
      if (event.cancelled) continue;

      seen.add(event.uid);
      const checkIn = zonedToUtc(event.startDay, times.checkinTime.slice(0, 5), times.timeZone);
      const details = feed.channel === "airbnb" ? extractAirbnbDetails(event.description) : null;
      const code = details?.code ?? null;
      const prev = byUid.get(event.uid);

      if (!prev) {
        plan.inserts.push({
          external_uid: event.uid,
          channel: feed.channel,
          confirmation_code: code,
          check_in_at: checkIn.toISOString(),
          check_out_at: checkOut.toISOString(),
          notes: details?.phoneLast4 ? `Teléfono (últimos 4): ${details.phoneLast4}` : "",
        });
        continue;
      }

      const datesChanged =
        new Date(prev.check_in_at).getTime() !== checkIn.getTime() ||
        new Date(prev.check_out_at).getTime() !== checkOut.getTime();
      const reactivated = prev.status === "cancelled";
      const codeChanged = code !== null && code !== prev.confirmation_code;
      if (datesChanged || reactivated || codeChanged) {
        plan.updates.push({
          id: prev.id,
          check_in_at: checkIn.toISOString(),
          check_out_at: checkOut.toISOString(),
          status: reactivated ? "confirmed" : prev.status,
          confirmation_code: code ?? prev.confirmation_code,
        });
      }
    }
  }

  const syncedChannels = new Set(feeds.map((f) => f.channel));
  for (const r of existing) {
    if (
      r.external_uid &&
      syncedChannels.has(r.channel) &&
      r.status === "confirmed" &&
      new Date(r.check_in_at) > now &&
      !seen.has(r.external_uid)
    ) {
      plan.cancellations.push(r.id);
    }
  }

  return plan;
}
