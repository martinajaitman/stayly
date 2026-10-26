import type { SupabaseClient } from "@supabase/supabase-js";
import type { Property } from "@/lib/types";
import { detectChannel, parseIcal } from "./parse";
import { planSync, type ExistingReservation, type FeedResult } from "./plan";

export interface SyncResult {
  propertyId: string;
  inserted: number;
  updated: number;
  cancelled: number;
  errors: string[];
}

async function fetchFeed(url: string): Promise<FeedResult> {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error("La respuesta no es un calendario iCal");
  return { channel: detectChannel(url, text), events: parseIcal(text) };
}

type SyncableProperty = Pick<Property, "id" | "organization_id" | "ical_urls" | "checkin_time" | "checkout_time">;

/** Sincroniza los feeds iCal de una propiedad. Sirve con cliente de usuario (RLS) o service role. */
export async function syncProperty(
  supabase: SupabaseClient,
  property: SyncableProperty,
  timeZone: string,
): Promise<SyncResult> {
  const result: SyncResult = { propertyId: property.id, inserted: 0, updated: 0, cancelled: 0, errors: [] };
  if (property.ical_urls.length === 0) return result;

  const feeds: FeedResult[] = [];
  for (const url of property.ical_urls) {
    try {
      feeds.push(await fetchFeed(url));
    } catch (e) {
      result.errors.push(`${url}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const { data: existing, error } = await supabase
    .from("reservations")
    .select("id, external_uid, channel, check_in_at, check_out_at, status, confirmation_code")
    .eq("property_id", property.id)
    .not("external_uid", "is", null);
  if (error) throw error;

  const plan = planSync((existing ?? []) as ExistingReservation[], feeds, {
    checkinTime: property.checkin_time,
    checkoutTime: property.checkout_time,
    timeZone,
  });

  if (plan.inserts.length) {
    const { error } = await supabase.from("reservations").insert(
      plan.inserts.map((r) => ({ ...r, organization_id: property.organization_id, property_id: property.id })),
    );
    if (error) result.errors.push(error.message);
    else result.inserted = plan.inserts.length;
  }
  for (const { id, ...fields } of plan.updates) {
    const { error } = await supabase.from("reservations").update(fields).eq("id", id);
    if (error) result.errors.push(error.message);
    else result.updated++;
  }
  if (plan.cancellations.length) {
    const { error } = await supabase.from("reservations").update({ status: "cancelled" }).in("id", plan.cancellations);
    if (error) result.errors.push(error.message);
    else result.cancelled = plan.cancellations.length;
  }

  await supabase
    .from("properties")
    .update({
      ical_last_synced_at: new Date().toISOString(),
      ical_last_error: result.errors.length ? result.errors.join("\n") : null,
    })
    .eq("id", property.id);

  return result;
}
