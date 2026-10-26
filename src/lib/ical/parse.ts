import type { BookingChannel } from "@/lib/types";

export interface IcalEvent {
  uid: string;
  summary: string;
  description: string;
  /** YYYY-MM-DD (Airbnb y Booking exportan eventos de día completo). */
  startDay: string;
  /** YYYY-MM-DD, exclusivo: el día del check-out. */
  endDay: string;
  cancelled: boolean;
}

/** Despliega las líneas continuadas (RFC 5545 §3.1) y separa en líneas lógicas. */
function unfold(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function unescapeText(value: string): string {
  return value.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
}

/** Acepta `20261105`, `20261105T150000Z` o `20261105T150000`; devuelve el día. */
function parseDay(value: string): string | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function parseIcal(text: string): IcalEvent[] {
  const events: IcalEvent[] = [];
  let current: Record<string, string> | null = null;

  for (const line of unfold(text)) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current) {
        const startDay = parseDay(current.DTSTART ?? "");
        const endDay = parseDay(current.DTEND ?? "");
        if (current.UID && startDay && endDay && endDay > startDay) {
          events.push({
            uid: current.UID,
            summary: unescapeText(current.SUMMARY ?? ""),
            description: unescapeText(current.DESCRIPTION ?? ""),
            startDay,
            endDay,
            cancelled: (current.STATUS ?? "").toUpperCase() === "CANCELLED",
          });
        }
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    // "DTSTART;VALUE=DATE:20261105" → nombre "DTSTART"
    const name = line.slice(0, colon).split(";")[0].toUpperCase();
    current[name] = line.slice(colon + 1);
  }

  return events;
}

/**
 * Detecta el canal por la URL y, si no alcanza, por el PRODID del calendario
 * (Airbnb: "-//Airbnb Inc//…", Booking: "-//admin.booking.com//…").
 */
export function detectChannel(url: string, icalText = ""): BookingChannel {
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();
  if (host.includes("airbnb")) return "airbnb";
  if (host.includes("booking.com")) return "booking";
  const prodId = icalText.match(/^PRODID[^:]*:(.*)$/m)?.[1] ?? "";
  if (/airbnb/i.test(prodId)) return "airbnb";
  if (/booking\.com/i.test(prodId)) return "booking";
  return "other";
}

/**
 * Airbnb exporta tanto reservas ("Reserved") como bloqueos manuales
 * ("Airbnb (Not available)"). Los bloqueos no son reservas.
 */
export function isBlock(event: IcalEvent, channel: BookingChannel): boolean {
  if (channel === "airbnb") return /not available/i.test(event.summary);
  return /^blocked$/i.test(event.summary.trim());
}

/** Datos extra que Airbnb incluye en DESCRIPTION. */
export function extractAirbnbDetails(description: string): { code: string | null; phoneLast4: string | null } {
  const code = description.match(/reservations\/details\/([A-Z0-9]+)/i)?.[1] ?? null;
  const phoneLast4 = description.match(/Last 4 Digits\):\s*(\d{4})/i)?.[1] ?? null;
  return { code, phoneLast4 };
}
