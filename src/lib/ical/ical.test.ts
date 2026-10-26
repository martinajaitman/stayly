import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectChannel, extractAirbnbDetails, isBlock, parseIcal } from "./parse";
import { planSync, type ExistingReservation } from "./plan";

const fixture = (name: string) => readFileSync(join(__dirname, "__fixtures__", name), "utf8");
const BA = { checkinTime: "15:00:00", checkoutTime: "10:00:00", timeZone: "America/Argentina/Buenos_Aires" };
const NOW = new Date("2026-10-26T12:00:00Z");

describe("parseIcal", () => {
  it("lee reservas y bloqueos de Airbnb, con líneas plegadas", () => {
    const events = parseIcal(fixture("airbnb.ics"));
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ uid: "1418fb94e984-a1b2c3@airbnb.com", startDay: "2026-11-05", endDay: "2026-11-10" });
    expect(extractAirbnbDetails(events[0].description)).toEqual({ code: "HMABC123XY", phoneLast4: "4821" });
    expect(isBlock(events[0], "airbnb")).toBe(false);
    expect(isBlock(events[1], "airbnb")).toBe(true);
  });

  it("trata los eventos de Booking como reservas", () => {
    const [event] = parseIcal(fixture("booking.ics"));
    expect(event).toMatchObject({ startDay: "2026-11-15", endDay: "2026-11-18" });
    expect(isBlock(event, "booking")).toBe(false);
  });

  it("detecta el canal por la URL", () => {
    expect(detectChannel("https://www.airbnb.com.ar/calendar/ical/123.ics?s=abc")).toBe("airbnb");
    expect(detectChannel("https://admin.booking.com/hotel/hoteladmin/ical.html?t=x")).toBe("booking");
    expect(detectChannel("https://example.com/cal.ics")).toBe("other");
  });
});

describe("planSync", () => {
  const airbnb = { channel: "airbnb" as const, events: parseIcal(fixture("airbnb.ics")) };

  it("crea reservas nuevas con horario de la propiedad en la zona horaria local", () => {
    const plan = planSync([], [airbnb], BA, NOW);
    expect(plan.inserts).toHaveLength(1);
    expect(plan.inserts[0]).toMatchObject({
      channel: "airbnb",
      confirmation_code: "HMABC123XY",
      check_in_at: "2026-11-05T18:00:00.000Z", // 15:00 en Buenos Aires (UTC-3)
      check_out_at: "2026-11-10T13:00:00.000Z",
      notes: "Teléfono (últimos 4): 4821",
    });
  });

  const existing = (over: Partial<ExistingReservation>): ExistingReservation => ({
    id: "r1",
    external_uid: "1418fb94e984-a1b2c3@airbnb.com",
    channel: "airbnb",
    check_in_at: "2026-11-05T18:00:00.000Z",
    check_out_at: "2026-11-10T13:00:00.000Z",
    status: "confirmed",
    confirmation_code: "HMABC123XY",
    ...over,
  });

  it("no hace nada si la reserva no cambió", () => {
    expect(planSync([existing({})], [airbnb], BA, NOW)).toEqual({ inserts: [], updates: [], cancellations: [] });
  });

  it("actualiza fechas modificadas y reactiva reservas canceladas", () => {
    const plan = planSync([existing({ check_out_at: "2026-11-09T13:00:00.000Z", status: "cancelled" })], [airbnb], BA, NOW);
    expect(plan.updates).toEqual([
      expect.objectContaining({ id: "r1", check_out_at: "2026-11-10T13:00:00.000Z", status: "confirmed" }),
    ]);
  });

  it("cancela reservas futuras que desaparecieron del feed del mismo canal", () => {
    const gone = existing({ id: "r2", external_uid: "gone@airbnb.com" });
    const otherChannel = existing({ id: "r3", external_uid: "x@booking.com", channel: "booking" });
    const started = existing({ id: "r4", external_uid: "started@airbnb.com", check_in_at: "2026-10-20T18:00:00.000Z" });
    const manual = existing({ id: "r5", external_uid: null, channel: "direct" });
    const plan = planSync([existing({}), gone, otherChannel, started, manual], [airbnb], BA, NOW);
    expect(plan.cancellations).toEqual(["r2"]);
  });

  it("ignora reservas que ya terminaron", () => {
    const plan = planSync([], [airbnb], BA, new Date("2026-11-11T00:00:00Z"));
    expect(plan.inserts).toEqual([]);
  });
});
