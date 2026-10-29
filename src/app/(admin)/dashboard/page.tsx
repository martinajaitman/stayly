import clsx from "clsx";
import Link from "next/link";
import { PropertyStatusBadge } from "@/components/status";
import { Badge, Card, EmptyState } from "@/components/ui";
import { processDueCheckouts } from "@/lib/automation/events";
import { formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { addDays, toZonedDay, zonedToUtc } from "@/lib/time";
import type { Property, Reservation } from "@/lib/types";

type Arrival = Reservation & { properties: { name: string } | null; guests: { full_name: string; phone: string | null } | null };

export default async function DashboardPage() {
  const { supabase, org } = await requireAdmin();
  // El cron del plan gratuito corre una vez por día: se completa acá al abrir el panel.
  await processDueCheckouts(org.id);
  const tz = org.timezone;
  const now = new Date();
  const today = toZonedDay(now, tz);
  const dayStart = zonedToUtc(today, "00:00", tz).toISOString();
  const dayEnd = zonedToUtc(addDays(today, 1), "00:00", tz).toISOString();
  const weekEnd = zonedToUtc(addDays(today, 7), "00:00", tz).toISOString();

  const active = () => supabase.from("reservations").select("*", { count: "exact", head: true }).neq("status", "cancelled");
  const [checkins, checkouts, staying, cleanings, incidents, props, arrivals, attention] = await Promise.all([
    active().gte("check_in_at", dayStart).lt("check_in_at", dayEnd),
    active().gte("check_out_at", dayStart).lt("check_out_at", dayEnd),
    supabase.from("reservations").select("guests_count").neq("status", "cancelled").lte("check_in_at", now.toISOString()).gt("check_out_at", now.toISOString()),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("type", "cleaning").neq("status", "done"),
    supabase.from("incidents").select("*", { count: "exact", head: true }).neq("status", "resolved"),
    supabase.from("properties").select("id, name, status, address").order("name"),
    supabase
      .from("reservations")
      .select("*, properties(name), guests(full_name, phone)")
      .neq("status", "cancelled")
      .gte("check_in_at", dayStart)
      .lt("check_in_at", weekEnd)
      .order("check_in_at")
      .limit(10),
    supabase.from("conversations").select("*", { count: "exact", head: true }).eq("needs_attention", true),
  ]);

  const guestsNow = (staying.data ?? []).reduce((sum, r) => sum + (r.guests_count ?? 0), 0);
  const kpis = [
    { label: "Check-ins", value: checkins.count ?? 0, tone: "" },
    { label: "Check-outs", value: checkouts.count ?? 0, tone: "" },
    { label: "Huéspedes", value: guestsNow, tone: "" },
    { label: "Limpiezas", value: cleanings.count ?? 0, tone: "bg-warn-soft text-warn" },
    { label: "Incidencias", value: incidents.count ?? 0, tone: "bg-danger-soft text-danger" },
  ];
  const properties = (props.data ?? []) as Pick<Property, "id" | "name" | "status" | "address">[];
  const upcoming = (arrivals.data ?? []) as Arrival[];
  const title = new Intl.DateTimeFormat("es-AR", { timeZone: tz, day: "numeric", month: "long" }).format(now);

  return (
    <>
      <div className="mb-6 flex items-end justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Hoy, {title}</h1>
        <p className="text-sm text-muted">{properties.length} propiedades</p>
      </div>

      {(attention.count ?? 0) > 0 && (
        <Link href="/inbox" className="mb-4 flex items-center justify-between rounded-2xl bg-warn-soft px-5 py-3 text-warn">
          <span className="font-medium">{attention.count} conversación(es) de huéspedes necesitan tu respuesta</span>
          <span className="text-sm">Ver →</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className={clsx("rounded-2xl border border-border bg-surface p-4", k.tone && `${k.tone} border-transparent`)}>
            <p className="text-sm">{k.label}</p>
            <p className="mt-1 text-3xl font-semibold">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted">Propiedades</h2>
          {properties.length === 0 ? (
            <EmptyState>
              <Link href="/properties/new" className="text-accent">Cargá tu primera propiedad</Link>
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-2">
              {properties.map((p) => (
                <Link key={p.id} href={`/properties/${p.id}`} className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 hover:bg-surface-muted">
                  <span>{p.name}</span>
                  <PropertyStatusBadge status={p.status} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted">Próximas llegadas (7 días)</h2>
          {upcoming.length === 0 ? (
            <EmptyState>No hay llegadas esta semana.</EmptyState>
          ) : (
            <Card className="divide-y divide-border p-0">
              {upcoming.map((r) => (
                <Link key={r.id} href={`/reservations/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-muted/50">
                  <div>
                    <p className="font-medium">{r.guests?.full_name || r.confirmation_code || "Sin datos"}</p>
                    <p className="text-sm text-muted">{r.properties?.name} · {formatDateTime(r.check_in_at, tz)}</p>
                  </div>
                  {!r.guests?.phone && <Badge tone="yellow">Falta contacto</Badge>}
                </Link>
              ))}
            </Card>
          )}
        </section>
      </div>
    </>
  );
}
