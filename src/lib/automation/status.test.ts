import { describe, expect, it } from "vitest";
import { derivePropertyStatus, isCheckoutDue, type PropertySituation } from "./status";

const base: PropertySituation = { current: "available", guestInside: false, openCleaning: false, urgentIncident: false };

describe("derivePropertyStatus", () => {
  it("una incidencia urgente manda sobre todo", () => {
    expect(derivePropertyStatus({ ...base, guestInside: true, openCleaning: true, urgentIncident: true })).toBe("maintenance");
  });
  it("con huésped adentro está ocupada aunque haya limpieza pendiente", () => {
    expect(derivePropertyStatus({ ...base, guestInside: true, openCleaning: true })).toBe("occupied");
  });
  it("después del check-out queda en limpieza", () => {
    expect(derivePropertyStatus({ ...base, current: "occupied", openCleaning: true })).toBe("cleaning");
  });
  it("al terminar la limpieza o el arreglo queda lista", () => {
    expect(derivePropertyStatus({ ...base, current: "cleaning" })).toBe("ready");
    expect(derivePropertyStatus({ ...base, current: "maintenance" })).toBe("ready");
    expect(derivePropertyStatus({ ...base, current: "occupied" })).toBe("ready");
  });
  it("si ya estaba libre conserva su estado", () => {
    expect(derivePropertyStatus({ ...base, current: "available" })).toBe("available");
    expect(derivePropertyStatus({ ...base, current: "ready" })).toBe("ready");
  });
});

describe("isCheckoutDue", () => {
  const now = new Date("2026-10-29T15:00:00Z");
  it("cierra reservas vencidas hace más de una hora", () => {
    expect(isCheckoutDue({ status: "checked_in", check_out_at: "2026-10-29T13:00:00Z" }, now)).toBe(true);
    expect(isCheckoutDue({ status: "confirmed", check_out_at: "2026-10-29T13:59:00Z" }, now)).toBe(true);
  });
  it("respeta el margen y no toca reservas cerradas o canceladas", () => {
    expect(isCheckoutDue({ status: "checked_in", check_out_at: "2026-10-29T14:30:00Z" }, now)).toBe(false);
    expect(isCheckoutDue({ status: "checked_out", check_out_at: "2026-10-28T13:00:00Z" }, now)).toBe(false);
    expect(isCheckoutDue({ status: "cancelled", check_out_at: "2026-10-28T13:00:00Z" }, now)).toBe(false);
  });
});
