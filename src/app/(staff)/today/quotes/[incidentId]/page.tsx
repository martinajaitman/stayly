import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PriorityBadge } from "@/components/status";
import { Card } from "@/components/ui";
import { getSession } from "@/lib/session";
import { candidateSlots, formatSlot, SLOT_LABEL, type DaySlot } from "@/lib/slots";
import { createAdminClient } from "@/lib/supabase/admin";
import { SERVICE_LABEL, type IncidentPriority, type ServiceType } from "@/lib/types";
import { QuoteForm } from "./quote-form";

export default async function QuotePage({ params }: PageProps<"/today/quotes/[incidentId]">) {
  const { incidentId } = await params;
  const { profile, org } = await getSession();
  if (profile.role !== "maintenance") redirect("/today");
  const db = createAdminClient();
  const { data: request } = await db.from("quote_requests").select("id").eq("incident_id", incidentId).eq("professional_id", profile.id).maybeSingle();
  if (!request) notFound();

  const [{ data: incident }, { data: quote }, { data: availability }] = await Promise.all([
    db.from("incidents").select("number, title, description, service, priority, status, quote_deadline, properties(name)").eq("id", incidentId).single(),
    db.from("quotes").select("repair_amount, replace_amount, notes, proposed_slots").eq("incident_id", incidentId).eq("professional_id", profile.id).maybeSingle(),
    db.from("professional_availability").select("weekday, slot").eq("profile_id", profile.id),
  ]);
  if (!incident) notFound();
  const i = incident as unknown as {
    number: number; title: string; description: string; service: ServiceType | null; priority: IncidentPriority; status: string; quote_deadline: string | null; properties: { name: string } | null;
  };
  const slots = candidateSlots((availability ?? []) as { weekday: number; slot: DaySlot }[], org.timezone).map((s) => ({
    iso: s.iso,
    label: `${new Intl.DateTimeFormat("es-AR", { timeZone: org.timezone, weekday: "long", day: "numeric", month: "short" }).format(new Date(s.iso)).replace(/^./, (c) => c.toUpperCase())} · ${SLOT_LABEL[s.slot]}`,
  }));

  return (
    <>
      <Link href="/today" className="mb-4 inline-flex items-center gap-1 text-sm text-muted"><ChevronLeft size={16} /> Volver</Link>
      <p className="text-sm text-muted">Pedido de presupuesto · #{i.number}</p>
      <h1 className="mb-3 text-xl font-semibold">{i.title}</h1>
      <Card className="mb-5 flex flex-col gap-2 text-sm">
        <p><span className="text-muted">Rubro:</span> {i.service ? SERVICE_LABEL[i.service] : "—"}</p>
        <p><span className="text-muted">Dónde:</span> {i.properties?.name} <span className="text-muted">(la dirección te llega si te eligen)</span></p>
        {i.description && <p className="rounded-xl bg-surface-muted p-3">“{i.description}”</p>}
        <div><PriorityBadge priority={i.priority} /></div>
        {i.quote_deadline && <p className="text-warn">Cotizá antes de: {formatSlot(i.quote_deadline, org.timezone)}</p>}
      </Card>
      {i.status === "quoting" ? (
        <QuoteForm
          incidentId={incidentId}
          slots={slots}
          initial={quote ? { repair: quote.repair_amount, replace: quote.replace_amount, notes: quote.notes, slots: quote.proposed_slots } : null}
        />
      ) : (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">Este pedido ya cerró. Te avisamos si te eligieron.</p>
      )}
    </>
  );
}
