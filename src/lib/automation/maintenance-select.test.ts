import { describe, expect, it } from "vitest";
import { fundRemaining, monthBounds, selectQuote, type QuoteInput } from "./maintenance-select";

const q = (id: string, repair: number | null, replace: number | null, minute = 0): QuoteInput => ({
  id,
  professional_id: `pro-${id}`,
  repair_amount: repair,
  replace_amount: replace,
  created_at: new Date(Date.UTC(2026, 9, 30, 12, minute)).toISOString(),
});

describe("selectQuote", () => {
  it("recomienda la más barata dentro del tope, por tipo y en general", () => {
    const s = selectQuote([q("ricardo", 40000, 90000), q("luis", 35000, null, 5)], 60000, 300000);
    expect(s.recommended).toMatchObject({ quoteId: "luis", resolution: "repair", amount: 35000 });
    expect(s.bestRepair?.quoteId).toBe("luis");
    expect(s.bestReplace).toBeNull(); // 90.000 supera el tope de 60.000
  });

  it("el saldo del pozo también limita", () => {
    const s = selectQuote([q("ricardo", 40000, null), q("luis", 35000, null)], 60000, 30000);
    expect(s.recommended).toBeNull();
    expect(s.cheapestOverall).toMatchObject({ quoteId: "luis", amount: 35000, withinBudget: false });
  });

  it("sin tope ni pozo configurados toma la más barata", () => {
    expect(selectQuote([q("a", 50000, 20000)], null, null).recommended).toMatchObject({ resolution: "replace", amount: 20000 });
  });

  it("a igual precio gana quien cotizó primero", () => {
    const s = selectQuote([q("tarde", 30000, null, 30), q("temprano", 30000, null, 10)], 60000, null);
    expect(s.recommended?.quoteId).toBe("temprano");
  });

  it("sin cotizaciones no recomienda nada", () => {
    expect(selectQuote([], 60000, 100000)).toMatchObject({ recommended: null, cheapestOverall: null, options: [] });
  });
});

describe("pozo mensual", () => {
  it("descuenta lo aprobado en el mes", () => {
    expect(fundRemaining(300000, [35000, 15000])).toBe(250000);
  });
  it("calcula el mes en la zona horaria de la organización", () => {
    // 1 de noviembre 01:00 UTC = 31 de octubre 22:00 en Buenos Aires
    expect(monthBounds(new Date("2026-11-01T01:00:00Z"), "America/Argentina/Buenos_Aires")).toEqual({ start: "2026-10-01", end: "2026-11-01" });
    expect(monthBounds(new Date("2026-12-15T12:00:00Z"), "America/Argentina/Buenos_Aires")).toEqual({ start: "2026-12-01", end: "2027-01-01" });
  });
});
