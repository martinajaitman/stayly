import clsx from "clsx";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ChannelBadge, ReservationStatusBadge } from "@/components/status";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { formatDate, nights } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import type { Reservation } from "@/lib/types";

type Row = Reservation & { properties: { name: string } | null; guests: { full_name: string; phone: string | null } | null };

const FILTERS = { upcoming: "Próximas y en curso", past: "Pasadas", cancelled: "Canceladas" } as const;

export default async function ReservationsPage({ searchParams }: PageProps<"/reservations">) {
  const { filter: raw } = await searchParams;
  const filter = (typeof raw === "string" && raw in FILTERS ? raw : "upcoming") as keyof typeof FILTERS;
  const { supabase, org } = await requireAdmin();
  const now = new Date().toISOString();

  let query = supabase.from("reservations").select("*, properties(name), guests(full_name, phone)");
  if (filter === "upcoming") query = query.neq("status", "cancelled").gte("check_out_at", now).order("check_in_at");
  if (filter === "past") query = query.neq("status", "cancelled").lt("check_out_at", now).order("check_in_at", { ascending: false });
  if (filter === "cancelled") query = query.eq("status", "cancelled").order("check_in_at", { ascending: false });
  const { data } = await query.limit(200);
  const rows = (data ?? []) as Row[];

  return (
    <>
      <PageHeader
        title="Reservas"
        actions={
          <Link href="/reservations/new" className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white">
            <Plus size={16} /> Reserva directa
          </Link>
        }
      />
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {Object.entries(FILTERS).map(([key, label]) => (
          <Link
            key={key}
            href={`/reservations?filter=${key}`}
            className={clsx("rounded-full px-3 py-1 text-sm whitespace-nowrap", key === filter ? "bg-foreground text-background" : "bg-surface-muted")}
          >
            {label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState>No hay reservas para mostrar.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Huésped</th>
                <th className="px-4 py-3 font-medium">Propiedad</th>
                <th className="px-4 py-3 font-medium">Estadía</th>
                <th className="px-4 py-3 font-medium">Canal</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                  <td className="px-4 py-3">
                    <Link href={`/reservations/${r.id}`} className="font-medium hover:text-accent">
                      {r.guests?.full_name || r.confirmation_code || "Sin datos"}
                    </Link>
                    {!r.guests?.phone && r.status !== "cancelled" && (
                      <span className="ml-2">
                        <Badge tone="yellow">Falta contacto</Badge>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{r.properties?.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDate(r.check_in_at, org.timezone)} → {formatDate(r.check_out_at, org.timezone)}
                    <span className="text-muted"> · {nights(r.check_in_at, r.check_out_at)} n.</span>
                  </td>
                  <td className="px-4 py-3"><ChannelBadge channel={r.channel} /></td>
                  <td className="px-4 py-3"><ReservationStatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
