import Link from "next/link";
import { CalendarClock, ChevronRight, FileText, MapPin } from "lucide-react";
import { IncidentStatusBadge } from "@/components/status";
import { Badge, Card, EmptyState } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { getSession } from "@/lib/session";
import { formatSlot } from "@/lib/slots";
import { createAdminClient } from "@/lib/supabase/admin";
import { SERVICE_LABEL, type IncidentStatus, type ServiceType } from "@/lib/types";
import { ProTabs } from "./pro-tabs";

type RequestRow = {
  incident_id: string;
  incidents: { number: number; title: string; service: ServiceType | null; status: IncidentStatus; quote_deadline: string | null; properties: { name: string } | null } | null;
};

export async function ProHome({ sent }: { sent: boolean }) {
  const { supabase, profile, org } = await getSession();
  const db = createAdminClient();
  const [{ data: requests }, { data: myQuotes }, { data: visits }] = await Promise.all([
    // Datos limitados (sin dirección ni acceso) de las incidencias donde le pidieron presupuesto.
    db
      .from("quote_requests")
      .select("incident_id, incidents(number, title, service, status, quote_deadline, properties(name))")
      .eq("professional_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(30),
    db.from("quotes").select("incident_id, repair_amount, replace_amount, status").eq("professional_id", profile.id),
    supabase
      .from("incidents")
      .select("id, number, title, status, visit_at, approved_amount, properties(name, address)")
      .eq("assigned_to", profile.id)
      .in("status", ["assigned", "scheduled", "in_progress"])
      .order("visit_at", { nullsFirst: false }),
  ]);
  const quoted = new Map((myQuotes ?? []).map((q) => [q.incident_id, q]));
  const open = ((requests ?? []) as unknown as RequestRow[]).filter((r) => r.incidents?.status === "quoting");
  const pendingToQuote = open.filter((r) => !quoted.has(r.incident_id));
  const sentQuotes = open.filter((r) => quoted.has(r.incident_id));
  const myVisits = (visits ?? []) as unknown as {
    id: string; number: number; title: string; status: IncidentStatus; visit_at: string | null; approved_amount: number | null; properties: { name: string; address: string } | null;
  }[];

  return (
    <>
      <h1 className="text-2xl font-semibold">Hola, {profile.full_name.split(" ")[0]}</h1>
      <p className="mb-4 text-muted">
        {pendingToQuote.length} pedido(s) para cotizar · {myVisits.length} visita(s)
      </p>
      <ProTabs active="home" />
      {sent && <p className="mb-4 rounded-2xl bg-ok-soft px-4 py-3 text-sm text-ok">✓ Presupuesto enviado. Te avisamos si te eligen.</p>}

      <h2 className="mb-2 text-sm font-medium text-muted">Mis visitas</h2>
      <div className="mb-6 flex flex-col gap-3">
        {myVisits.length === 0 && <EmptyState>Cuando aprueben uno de tus presupuestos, la visita aparece acá.</EmptyState>}
        {myVisits.map((v) => (
          <Link key={v.id} href={`/today/visits/${v.id}`}>
            <Card className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{v.title}</p>
                <IncidentStatusBadge status={v.status} />
              </div>
              <p className="flex items-center gap-1 text-sm text-muted"><MapPin size={14} /> {v.properties?.name}</p>
              <p className="flex items-center gap-1 text-sm">
                <CalendarClock size={14} className="text-accent" />
                {v.visit_at ? formatSlot(v.visit_at, org.timezone) : "Esperando que el huésped elija el horario"}
              </p>
              <p className="text-sm text-muted">Aprobado: {formatMoney(v.approved_amount)}</p>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="mb-2 text-sm font-medium text-muted">Pedidos de presupuesto</h2>
      <div className="flex flex-col gap-3">
        {pendingToQuote.length === 0 && sentQuotes.length === 0 && <EmptyState>No tenés pedidos abiertos. Te avisamos cuando llegue uno de tu rubro.</EmptyState>}
        {pendingToQuote.map((r) => (
          <Link key={r.incident_id} href={`/today/quotes/${r.incident_id}`}>
            <Card className="flex items-center gap-3">
              <FileText className="shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{r.incidents?.title}</p>
                <p className="text-sm text-muted">
                  {r.incidents?.service && SERVICE_LABEL[r.incidents.service]} · {r.incidents?.properties?.name}
                </p>
                {r.incidents?.quote_deadline && <p className="text-xs text-warn">Cotizá antes de: {formatSlot(r.incidents.quote_deadline, org.timezone)}</p>}
              </div>
              <ChevronRight className="text-muted" />
            </Card>
          </Link>
        ))}
        {sentQuotes.map((r) => {
          const q = quoted.get(r.incident_id)!;
          return (
            <Link key={r.incident_id} href={`/today/quotes/${r.incident_id}`}>
              <Card className="flex items-center justify-between gap-3 opacity-80">
                <div>
                  <p className="font-medium">{r.incidents?.title}</p>
                  <p className="text-sm text-muted">
                    {q.repair_amount ? `Arreglar ${formatMoney(q.repair_amount)}` : ""}
                    {q.repair_amount && q.replace_amount ? " · " : ""}
                    {q.replace_amount ? `Reemplazar ${formatMoney(q.replace_amount)}` : ""}
                  </p>
                </div>
                <Badge tone="blue">Enviado</Badge>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
