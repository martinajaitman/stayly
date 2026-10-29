import clsx from "clsx";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Sparkles } from "lucide-react";
import { IncidentStatusBadge, PriorityBadge } from "@/components/status";
import { Badge, Button, Card, Select } from "@/components/ui";
import { selectQuote, type Option } from "@/lib/automation/maintenance-select";
import { getFundStatus } from "@/lib/automation/maintenance";
import { formatDateTime, formatMoney } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { formatSlot } from "@/lib/slots";
import { INCIDENT_CATEGORY_LABEL, RESOLUTION_LABEL, SERVICE_LABEL, type Incident, type Quote } from "@/lib/types";
import { approve, closeQuotingNow, requestQuotes, scheduleByAdmin } from "../actions";
import { BudgetForm } from "./budget-form";

const REPORTED_BY: Record<string, string> = { guest: "el huésped", admin: "la administración", staff: "el personal", ai: "el asistente IA" };

export default async function IncidentPage({ params }: PageProps<"/tasks/incidents/[id]">) {
  const { id } = await params;
  const { supabase, org } = await requireAdmin();
  const tz = org.timezone;
  const [{ data }, { data: quoteRows }, { data: requests }, fund] = await Promise.all([
    supabase.from("incidents").select("*, properties(name), reservations(status, guests(full_name))").eq("id", id).maybeSingle(),
    supabase.from("quotes").select("*, profiles(full_name)").eq("incident_id", id).order("created_at"),
    supabase.from("quote_requests").select("professional_id, profiles(full_name)").eq("incident_id", id),
    getFundStatus(org.id),
  ]);
  if (!data) notFound();
  const i = data as Incident & { properties: { name: string } | null; reservations: { status: string; guests: { full_name: string } | null } | null };
  const quotes = (quoteRows ?? []) as (Quote & { profiles: { full_name: string } | null })[];
  const names = new Map(quotes.map((q) => [q.professional_id, q.profiles?.full_name ?? "Profesional"]));
  const pending = (requests ?? []).filter((r) => !quotes.some((q) => q.professional_id === r.professional_id));
  const selection = selectQuote(quotes, i.budget_cap, fund.monthly > 0 ? fund.remaining : null);
  const canApprove = i.status === "quoting" || i.status === "awaiting_approval";
  const selected = quotes.find((q) => q.id === i.selected_quote_id);
  const guestInside = i.reservations && ["confirmed", "checked_in"].includes(i.reservations.status);

  const optionButton = (o: Option | null, highlight: boolean) =>
    o && (
      <form action={approve.bind(null, i.id, o.quoteId, o.resolution)}>
        <Button className="w-full justify-between" variant={highlight ? "primary" : "secondary"}>
          <span>{RESOLUTION_LABEL[o.resolution]} con {names.get(o.professionalId)}</span>
          <span>{formatMoney(o.amount)}</span>
        </Button>
      </form>
    );

  return (
    <div className="max-w-4xl">
      <Link href="/tasks?tab=incidents" className="mb-4 inline-flex items-center gap-1 text-sm text-muted"><ChevronLeft size={16} /> Tareas</Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">#{i.number} · {i.properties?.name}</p>
          <h1 className="text-2xl font-semibold">{i.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {INCIDENT_CATEGORY_LABEL[i.category]} · reportado por {REPORTED_BY[i.reported_by] ?? i.reported_by} · {formatDateTime(i.created_at, tz)}
          </p>
        </div>
        <div className="flex gap-2"><PriorityBadge priority={i.priority} /><IncidentStatusBadge status={i.status} /></div>
      </div>

      {i.description && <Card className="mb-5 text-sm">“{i.description}”</Card>}

      <div className="mb-5 grid gap-4 md:grid-cols-[2fr_1fr]">
        <Card>
          <h2 className="mb-3 font-semibold">Rubro y presupuesto</h2>
          <BudgetForm id={i.id} cap={i.budget_cap} service={i.service} />
          {i.status === "pending" && i.service && (
            <form action={requestQuotes.bind(null, i.id)} className="mt-3">
              <Button variant="secondary">Pedir presupuestos a profesionales de {SERVICE_LABEL[i.service].toLowerCase()}</Button>
            </form>
          )}
        </Card>
        <Card className="bg-surface-muted/50">
          <p className="text-sm text-muted">Pozo de {fund.monthLabel}</p>
          <p className="text-2xl font-semibold">{formatMoney(fund.remaining)}</p>
          <p className="text-xs text-muted">disponible de {formatMoney(fund.monthly)} · <Link href="/settings" className="text-accent">configurar</Link></p>
        </Card>
      </div>

      {(quotes.length > 0 || pending.length > 0) && (
        <Card className="mb-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Presupuestos</h2>
            {i.status === "quoting" && (
              <span className="text-sm text-muted">
                {i.quote_deadline && `Cierra ${formatDateTime(i.quote_deadline, tz)}`}
                {quotes.length > 0 && (
                  <form action={closeQuotingNow.bind(null, i.id)} className="ml-3 inline">
                    <button className="text-accent">Elegir ahora</button>
                  </form>
                )}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-muted">
                <tr><th className="py-2 font-medium">Profesional</th><th className="font-medium">Arreglar</th><th className="font-medium">Reemplazar</th><th className="font-medium">Horarios</th><th /></tr>
              </thead>
              <tbody>
                {quotes.map((q) => {
                  const isRec = (r: "repair" | "replace") => selection.recommended?.quoteId === q.id && selection.recommended.resolution === r;
                  const cell = (amount: number | null, r: "repair" | "replace") => (
                    <td className={clsx("py-2", isRec(r) && "font-semibold text-ok")}>
                      {formatMoney(amount)}
                      {amount != null && selection.options.find((o) => o.quoteId === q.id && o.resolution === r)?.withinBudget === false && <span className="ml-1 text-xs text-danger">supera</span>}
                    </td>
                  );
                  return (
                    <tr key={q.id} className="border-t border-border align-top">
                      <td className="py-2">{q.profiles?.full_name}{q.notes && <p className="text-xs text-muted">{q.notes}</p>}</td>
                      {cell(q.repair_amount, "repair")}
                      {cell(q.replace_amount, "replace")}
                      <td className="py-2 text-xs text-muted">{q.proposed_slots.length} opción(es)</td>
                      <td className="py-2 text-right">{q.status === "selected" ? <Badge tone="green">Elegido</Badge> : q.status === "discarded" ? <Badge>Descartado</Badge> : null}</td>
                    </tr>
                  );
                })}
                {pending.map((r) => (
                  <tr key={r.professional_id} className="border-t border-border text-muted">
                    <td className="py-2">{(r.profiles as unknown as { full_name: string } | null)?.full_name}</td>
                    <td colSpan={4} className="py-2 text-xs">Todavía no cotizó</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canApprove && quotes.length > 0 && (
            <div className="mt-5 rounded-2xl bg-accent-soft/50 p-4">
              <p className="mb-3 flex items-center gap-2 font-medium">
                <Sparkles size={16} className="text-accent" />
                {selection.recommended
                  ? "Recomendación: el presupuesto más barato dentro del tope. Confirmá para asignarlo."
                  : "Ningún presupuesto entra en el tope o en el pozo. Podés subir el tope o aprobar igual."}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {selection.recommended ? (
                  <>
                    {optionButton(selection.bestRepair, selection.recommended.resolution === "repair")}
                    {optionButton(selection.bestReplace, selection.recommended.resolution === "replace")}
                  </>
                ) : (
                  optionButton(selection.cheapestOverall, false)
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {selected && (
        <Card className="mb-5">
          <h2 className="mb-2 font-semibold">Visita</h2>
          <p className="text-sm">
            {names.get(selected.professional_id)} · {i.resolution && RESOLUTION_LABEL[i.resolution]} · {formatMoney(i.approved_amount)}
          </p>
          {i.visit_at ? (
            <p className="mt-2 text-sm font-medium">📅 {formatSlot(i.visit_at, tz)}</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted">
                {guestInside ? `Esperando que ${i.reservations?.guests?.full_name ?? "el huésped"} elija el horario desde su página. Si preferís, elegilo vos:` : "No hay huésped para coordinar: elegí el horario."}
              </p>
              <form action={scheduleByAdmin.bind(null, i.id)} className="mt-2 flex gap-2">
                <Select name="slot" className="max-w-xs">
                  {selected.proposed_slots.filter((s) => new Date(s) > new Date()).map((s) => <option key={s} value={s}>{formatSlot(s, tz)}</option>)}
                </Select>
                <Button variant="secondary">Agendar</Button>
              </form>
            </>
          )}
          {i.resolution_notes && <p className="mt-3 rounded-xl bg-ok-soft p-3 text-sm text-ok">{i.resolution_notes}</p>}
        </Card>
      )}
    </div>
  );
}
