import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { FundStatus } from "@/lib/automation/maintenance";

export function FundCard({ fund }: { fund: FundStatus }) {
  if (fund.monthly <= 0) {
    return (
      <Link href="/settings" className="block rounded-2xl border border-dashed border-border p-4 text-sm text-muted hover:border-accent">
        Configurá el pozo mensual para incidencias →
      </Link>
    );
  }
  const pct = Math.max(0, Math.min(100, (fund.remaining / fund.monthly) * 100));
  return (
    <Link href="/settings" className="block rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm text-muted">Pozo de incidencias · {fund.monthLabel}</p>
        <p className="text-xs text-muted">usado {formatMoney(fund.used)}</p>
      </div>
      <p className="mt-1 text-2xl font-semibold">
        {formatMoney(fund.remaining)} <span className="text-sm font-normal text-muted">de {formatMoney(fund.monthly)}</span>
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className={pct < 20 ? "h-full bg-danger" : "h-full bg-ok"} style={{ width: `${pct}%` }} />
      </div>
    </Link>
  );
}
