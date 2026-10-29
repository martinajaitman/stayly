import "server-only";
import { formatMoney } from "@/lib/format";
import { notify, notifyAdmins } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { zonedToUtc } from "@/lib/time";
import { RESOLUTION_LABEL, SERVICE_LABEL, type Resolution, type ServiceType } from "@/lib/types";
import { refreshPropertyStatus } from "./events";
import { fundRemaining, monthBounds, selectQuote, type Option } from "./maintenance-select";

// Flujo de mantenimiento: pedido de presupuestos → selección del más barato dentro
// del tope y del pozo → aprobación del admin → el huésped elige horario → visita.

type IncidentRow = {
  id: string;
  organization_id: string;
  number: number;
  property_id: string;
  reservation_id: string | null;
  title: string;
  service: ServiceType | null;
  status: string;
  budget_cap: number | null;
  quote_deadline: string | null;
  selected_quote_id: string | null;
  assigned_to: string | null;
};

const INCIDENT_FIELDS =
  "id, organization_id, number, property_id, reservation_id, title, service, status, budget_cap, quote_deadline, selected_quote_id, assigned_to";

async function getIncident(id: string): Promise<IncidentRow> {
  const { data, error } = await createAdminClient().from("incidents").select(INCIDENT_FIELDS).eq("id", id).single();
  if (error || !data) throw new Error("Incidencia no encontrada");
  return data as IncidentRow;
}

const adminLink = (id: string) => `/tasks/incidents/${id}`;

export interface FundStatus {
  monthly: number;
  used: number;
  remaining: number;
  monthLabel: string;
}

/** Pozo del mes en curso (en la zona horaria de la organización). */
export async function getFundStatus(organizationId: string, now: Date = new Date()): Promise<FundStatus> {
  const db = createAdminClient();
  const { data: org } = await db.from("organizations").select("monthly_incident_fund, timezone").eq("id", organizationId).single();
  const tz = org?.timezone ?? "America/Argentina/Buenos_Aires";
  const { start, end } = monthBounds(now, tz);
  const { data: approved } = await db
    .from("incidents")
    .select("approved_amount")
    .eq("organization_id", organizationId)
    .not("approved_amount", "is", null)
    .gte("approved_at", zonedToUtc(start, "00:00", tz).toISOString())
    .lt("approved_at", zonedToUtc(end, "00:00", tz).toISOString());
  const monthly = Number(org?.monthly_incident_fund ?? 0);
  const amounts = (approved ?? []).map((a) => Number(a.approved_amount));
  const monthName = new Intl.DateTimeFormat("es-AR", { timeZone: tz, month: "long" }).format(now);
  return { monthly, used: amounts.reduce((s, a) => s + a, 0), remaining: fundRemaining(monthly, amounts), monthLabel: monthName };
}

/**
 * Arranca el pedido de presupuestos de una incidencia con rubro. Si no hay
 * profesionales de ese rubro, avisa al admin para que lo resuelva a mano.
 */
export async function startQuoting(incidentId: string) {
  const db = createAdminClient();
  const incident = await getIncident(incidentId);
  if (!incident.service || incident.status !== "pending") return;

  const [{ data: org }, { data: pros }] = await Promise.all([
    db.from("organizations").select("default_incident_cap, quote_window_minutes").eq("id", incident.organization_id).single(),
    db
      .from("profiles")
      .select("id, specialties")
      .eq("organization_id", incident.organization_id)
      .eq("role", "maintenance"),
  ]);
  const matching = (pros ?? []).filter((p) => (p.specialties as string[]).includes(incident.service!) || (p.specialties as string[]).includes("general"));
  const service = SERVICE_LABEL[incident.service];

  if (matching.length === 0) {
    await notifyAdmins(incident.organization_id, {
      title: `Incidencia #${incident.number}: no hay profesionales de ${service.toLowerCase()}`,
      body: `${incident.title}. Cargá uno en Equipo o asigná la incidencia a mano.`,
      link: adminLink(incident.id),
    });
    return;
  }

  const cap = incident.budget_cap ?? (Number(org?.default_incident_cap) > 0 ? Number(org!.default_incident_cap) : null);
  const deadline = new Date(Date.now() + (org?.quote_window_minutes ?? 120) * 60000);
  await db.from("incidents").update({ status: "quoting", budget_cap: cap, quote_deadline: deadline.toISOString() }).eq("id", incident.id);
  await db
    .from("quote_requests")
    .upsert(matching.map((p) => ({ organization_id: incident.organization_id, incident_id: incident.id, professional_id: p.id })), {
      onConflict: "incident_id,professional_id",
      ignoreDuplicates: true,
    });
  await notify(incident.organization_id, matching.map((p) => p.id), {
    title: `Nuevo pedido de presupuesto: ${service}`,
    body: incident.title,
    link: `/today/quotes/${incident.id}`,
  });
  await notifyAdmins(incident.organization_id, {
    title: `Incidencia #${incident.number}: pedimos ${matching.length} presupuesto(s)`,
    body: `${incident.title}${cap ? ` · tope ${formatMoney(cap)}` : " · sin tope"}. Te avisamos cuando haya uno para aprobar.`,
    link: adminLink(incident.id),
  });
}

export interface QuoteSubmission {
  repairAmount: number | null;
  replaceAmount: number | null;
  notes: string;
  proposedSlots: string[];
}

export async function submitQuote(incidentId: string, professionalId: string, q: QuoteSubmission) {
  const db = createAdminClient();
  const incident = await getIncident(incidentId);
  if (incident.status !== "quoting") throw new Error("Esta incidencia ya no está recibiendo presupuestos");
  const { data: request } = await db
    .from("quote_requests")
    .select("id")
    .eq("incident_id", incidentId)
    .eq("professional_id", professionalId)
    .maybeSingle();
  if (!request) throw new Error("No te pidieron presupuesto para esta incidencia");

  const { error } = await db.from("quotes").upsert(
    {
      organization_id: incident.organization_id,
      incident_id: incidentId,
      professional_id: professionalId,
      repair_amount: q.repairAmount,
      replace_amount: q.replaceAmount,
      notes: q.notes,
      proposed_slots: q.proposedSlots,
      status: "submitted",
    },
    { onConflict: "incident_id,professional_id" },
  );
  if (error) throw new Error(error.message);
  await closeQuotingIfReady(incidentId);
}

function describeOption(o: Option | null, names: Map<string, string>) {
  return o ? `${RESOLUTION_LABEL[o.resolution]} con ${names.get(o.professionalId) ?? "profesional"} · ${formatMoney(o.amount)}` : null;
}

/**
 * Cierra la ronda de presupuestos cuando respondieron todos, venció el plazo o
 * el admin lo pide, y le manda al admin la recomendación para que confirme.
 */
export async function closeQuotingIfReady(incidentId: string, force = false, now: Date = new Date()) {
  const db = createAdminClient();
  const incident = await getIncident(incidentId);
  if (incident.status !== "quoting") return;

  const [{ data: requests }, { data: quotes }] = await Promise.all([
    db.from("quote_requests").select("professional_id").eq("incident_id", incidentId),
    db.from("quotes").select("id, professional_id, repair_amount, replace_amount, created_at").eq("incident_id", incidentId),
  ]);
  const allAnswered = (quotes ?? []).length >= (requests ?? []).length;
  const expired = incident.quote_deadline ? new Date(incident.quote_deadline) <= now : false;
  if (!force && !allAnswered && !expired) return;

  if (!quotes?.length) {
    await db.from("incidents").update({ status: "pending" }).eq("id", incidentId);
    await notifyAdmins(incident.organization_id, {
      title: `Incidencia #${incident.number}: ningún profesional cotizó`,
      body: `${incident.title}. Asignala a mano o volvé a pedir presupuestos.`,
      link: adminLink(incidentId),
    });
    return;
  }

  const fund = await getFundStatus(incident.organization_id, now);
  const selection = selectQuote(quotes, incident.budget_cap, fund.monthly > 0 ? fund.remaining : null);
  const { data: pros } = await db.from("profiles").select("id, full_name").in("id", quotes.map((q) => q.professional_id));
  const names = new Map((pros ?? []).map((p) => [p.id, p.full_name]));

  await db.from("incidents").update({ status: "awaiting_approval" }).eq("id", incidentId);
  if (selection.recommended) {
    const lines = [describeOption(selection.bestRepair, names), describeOption(selection.bestReplace, names)].filter(Boolean);
    await notifyAdmins(incident.organization_id, {
      title: `Incidencia #${incident.number}: hay presupuesto para aprobar`,
      body: `Recomendado: ${describeOption(selection.recommended, names)}.${lines.length > 1 ? ` Opciones: ${lines.join(" / ")}.` : ""}`,
      link: adminLink(incidentId),
    });
  } else {
    await notifyAdmins(incident.organization_id, {
      title: `Incidencia #${incident.number}: ningún presupuesto entra en el tope`,
      body: `El más barato: ${describeOption(selection.cheapestOverall, names)}. Subí el tope o aprobalo igual.`,
      link: adminLink(incidentId),
    });
  }
}

/** Revisa los pedidos de presupuesto vencidos (cron y al abrir el panel). */
export async function processQuoteDeadlines(organizationId?: string, now: Date = new Date()) {
  let query = createAdminClient().from("incidents").select("id").eq("status", "quoting").lt("quote_deadline", now.toISOString());
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data } = await query;
  for (const i of data ?? []) await closeQuotingIfReady(i.id, false, now);
}

/** El admin confirma un presupuesto: queda asignado y se descuenta del pozo. */
export async function approveQuote(incidentId: string, quoteId: string, resolution: Resolution) {
  const db = createAdminClient();
  const incident = await getIncident(incidentId);
  if (!["quoting", "awaiting_approval"].includes(incident.status)) throw new Error("La incidencia ya tiene un presupuesto aprobado");
  const { data: quote } = await db.from("quotes").select("*").eq("id", quoteId).eq("incident_id", incidentId).single();
  if (!quote) throw new Error("Presupuesto no encontrado");
  const amount = Number(resolution === "repair" ? quote.repair_amount : quote.replace_amount);
  if (!amount) throw new Error("Ese profesional no cotizó esa opción");

  await db
    .from("incidents")
    .update({
      status: "assigned",
      assigned_to: quote.professional_id,
      selected_quote_id: quote.id,
      resolution,
      approved_amount: amount,
      approved_at: new Date().toISOString(),
    })
    .eq("id", incidentId);
  await db.from("quotes").update({ status: "selected" }).eq("id", quote.id);
  await db.from("quotes").update({ status: "discarded" }).eq("incident_id", incidentId).neq("id", quote.id);

  const { data: others } = await db.from("quote_requests").select("professional_id").eq("incident_id", incidentId).neq("professional_id", quote.professional_id);
  await notify(incident.organization_id, [quote.professional_id], {
    title: `¡Te eligieron! Incidencia #${incident.number}`,
    body: `${RESOLUTION_LABEL[resolution]} · ${formatMoney(amount)}. Te avisamos cuando el huésped elija el horario.`,
    link: `/today/visits/${incidentId}`,
  });
  await notify(incident.organization_id, (others ?? []).map((o) => o.professional_id), {
    title: `Incidencia #${incident.number}: se eligió otro presupuesto`,
    body: "Gracias por cotizar. Te avisamos con el próximo pedido.",
  });

  // Si hay un huésped en la propiedad, elige él el horario desde su página; si no, el admin.
  const guestCanPick = await hasActiveGuest(incident.reservation_id);
  if (!guestCanPick) {
    await notifyAdmins(incident.organization_id, {
      title: `Incidencia #${incident.number}: elegí el horario de la visita`,
      body: "No hay un huésped en la propiedad para coordinarlo.",
      link: adminLink(incidentId),
    });
  }
  await refreshPropertyStatus(incident.property_id);
}

export async function hasActiveGuest(reservationId: string | null): Promise<boolean> {
  if (!reservationId) return false;
  const { data } = await createAdminClient().from("reservations").select("status").eq("id", reservationId).single();
  return data?.status === "confirmed" || data?.status === "checked_in";
}

/** Agenda la visita en uno de los horarios que propuso el profesional elegido. */
export async function scheduleVisit(incidentId: string, slotIso: string, by: "guest" | "admin") {
  const db = createAdminClient();
  const incident = await getIncident(incidentId);
  if (!["assigned", "scheduled"].includes(incident.status) || !incident.selected_quote_id) throw new Error("La visita no se puede agendar todavía");
  const { data: quote } = await db.from("quotes").select("proposed_slots, professional_id").eq("id", incident.selected_quote_id).single();
  const slot = (quote?.proposed_slots as string[] | undefined)?.find((s) => new Date(s).getTime() === new Date(slotIso).getTime());
  if (!slot) throw new Error("Ese horario no está disponible");

  await db.from("incidents").update({ status: "scheduled", visit_at: slot }).eq("id", incidentId);
  const { data: org } = await db.from("organizations").select("timezone").eq("id", incident.organization_id).single();
  const when = new Intl.DateTimeFormat("es-AR", { timeZone: org?.timezone, weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(slot));
  await notify(incident.organization_id, [quote!.professional_id], {
    title: `Visita confirmada: ${when}`,
    body: `Incidencia #${incident.number} · ${incident.title}`,
    link: `/today/visits/${incidentId}`,
  });
  await notifyAdmins(incident.organization_id, {
    title: `Incidencia #${incident.number}: visita agendada ${when}`,
    body: by === "guest" ? "El huésped eligió el horario." : "",
    link: adminLink(incidentId),
  });
}

/** El profesional terminó el trabajo. */
export async function resolveVisit(incidentId: string, notes: string) {
  const db = createAdminClient();
  const incident = await getIncident(incidentId);
  await db
    .from("incidents")
    .update({ status: "resolved", resolved_at: new Date().toISOString(), resolution_notes: notes })
    .eq("id", incidentId);
  await refreshPropertyStatus(incident.property_id);
  await notifyAdmins(incident.organization_id, {
    title: `Incidencia #${incident.number} resuelta`,
    body: notes || incident.title,
    link: adminLink(incidentId),
  });
}
