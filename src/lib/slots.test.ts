import { describe, expect, it } from "vitest";
import { candidateSlots } from "./slots";

const TZ = "America/Argentina/Buenos_Aires";

describe("candidateSlots", () => {
  it("usa la disponibilidad semanal y la hora local", () => {
    // jueves 29/10/2026 08:00 en Buenos Aires
    const now = new Date("2026-10-29T11:00:00Z");
    const slots = candidateSlots([{ weekday: 4, slot: "afternoon" }, { weekday: 5, slot: "morning" }], TZ, now, 2);
    expect(slots.map((s) => s.iso)).toEqual(["2026-10-29T20:00:00.000Z", "2026-10-30T13:00:00.000Z"]);
  });
  it("descarta turnos que empiezan en menos de una hora", () => {
    const now = new Date("2026-10-29T12:30:00Z"); // 9:30 local, la mañana es a las 10
    expect(candidateSlots([{ weekday: 4, slot: "morning" }], TZ, now, 0)).toEqual([]);
  });
  it("sin disponibilidad cargada ofrece días hábiles", () => {
    const now = new Date("2026-10-31T11:00:00Z"); // sábado
    const days = new Set(candidateSlots([], TZ, now, 2).map((s) => s.day));
    expect([...days]).toEqual(["2026-11-02"]); // salta sábado y domingo
  });
});
