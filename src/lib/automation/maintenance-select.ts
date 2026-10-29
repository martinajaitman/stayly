import type { Resolution } from "@/lib/types";

export interface QuoteInput {
  id: string;
  professional_id: string;
  repair_amount: number | null;
  replace_amount: number | null;
  created_at: string;
}

export interface Option {
  quoteId: string;
  professionalId: string;
  resolution: Resolution;
  amount: number;
  withinBudget: boolean;
}

export interface Selection {
  /** La más barata de cada tipo que entra en el tope y en el saldo del pozo. */
  bestRepair: Option | null;
  bestReplace: Option | null;
  /** La más barata de todas las que entran. */
  recommended: Option | null;
  /** Si nada entra: la opción más barata igual, para que el admin decida si sube el tope. */
  cheapestOverall: Option | null;
  /** Todas las opciones ordenadas por precio. */
  options: Option[];
}

/**
 * Elige el presupuesto más conveniente: el menor precio que entre en el tope
 * de la incidencia y en lo que queda del pozo del mes. A igual precio gana
 * quien cotizó primero.
 */
export function selectQuote(quotes: QuoteInput[], budgetCap: number | null, fundRemaining: number | null): Selection {
  const limit = Math.min(budgetCap ?? Infinity, fundRemaining ?? Infinity);
  const order = new Map(quotes.map((q) => [q.id, new Date(q.created_at).getTime()]));
  const options: Option[] = [];
  for (const q of quotes) {
    for (const resolution of ["repair", "replace"] as const) {
      const amount = resolution === "repair" ? q.repair_amount : q.replace_amount;
      if (amount == null || amount <= 0) continue;
      options.push({ quoteId: q.id, professionalId: q.professional_id, resolution, amount: Number(amount), withinBudget: Number(amount) <= limit });
    }
  }
  options.sort((a, b) => a.amount - b.amount || order.get(a.quoteId)! - order.get(b.quoteId)!);
  const valid = options.filter((o) => o.withinBudget);
  return {
    bestRepair: valid.find((o) => o.resolution === "repair") ?? null,
    bestReplace: valid.find((o) => o.resolution === "replace") ?? null,
    recommended: valid[0] ?? null,
    cheapestOverall: options[0] ?? null,
    options,
  };
}

/** Saldo del pozo del mes: monto mensual menos lo aprobado en ese mes. */
export function fundRemaining(monthlyFund: number, approvedThisMonth: number[]): number {
  return monthlyFund - approvedThisMonth.reduce((sum, a) => sum + Number(a), 0);
}

/** Primer y último instante (exclusivo) del mes calendario de `now` en la zona horaria dada, como días YYYY-MM-DD. */
export function monthBounds(now: Date, timeZone: string): { start: string; end: string } {
  const [y, m] = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit" }).format(now).split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${y}-${pad(m)}-01`;
  const end = m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`;
  return { start, end };
}
