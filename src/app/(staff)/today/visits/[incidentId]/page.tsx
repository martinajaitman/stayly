import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ChevronLeft, KeyRound, MapPin, Phone } from "lucide-react";
import { IncidentStatusBadge } from "@/components/status";
import { Button, Card, Field, Textarea } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { getSession } from "@/lib/session";
import { formatSlot } from "@/lib/slots";
import { RESOLUTION_LABEL, type IncidentStatus, type Resolution } from "@/lib/types";
import { finishVisit, startVisit } from "../../../pro-actions";

export default async function VisitPage({ params }: PageProps<"/today/visits/[incidentId]">) {
  const { incidentId } = await params;
  const { supabase, profile, org } = await getSession();
  const { data } = await supabase
    .from("incidents")
    .select("id, number, title, description, status, visit_at, approved_amount, resolution, resolution_notes, properties(name, address, access_code, access_instructions, manager_contact)")
    .eq("id", incidentId)
    .eq("assigned_to", profile.id)
    .maybeSingle();
  if (!data) notFound();
  const v = data as unknown as {
    id: string; number: number; title: string; description: string; status: IncidentStatus; visit_at: string | null; approved_amount: number | null;
    resolution: Resolution | null; resolution_notes: string;
    properties: { name: string; address: string; access_code: string; access_instructions: string; manager_contact: string } | null;
  };
  const p = v.properties;

  return (
    <>
      <Link href="/today" className="mb-4 inline-flex items-center gap-1 text-sm text-muted"><ChevronLeft size={16} /> Volver</Link>
      <div className="mb-1 flex items-start justify-between gap-3">
        <h1 className="text-xl font-semibold">{v.title}</h1>
        <IncidentStatusBadge status={v.status} />
      </div>
      <p className="mb-4 text-sm text-muted">Incidencia #{v.number} · {v.resolution && RESOLUTION_LABEL[v.resolution]} · {formatMoney(v.approved_amount)}</p>

      <Card className="mb-4 flex flex-col gap-3 text-sm">
        <p className="flex items-center gap-2"><CalendarClock size={16} className="text-accent" /> {v.visit_at ? formatSlot(v.visit_at, org.timezone) : "El huésped todavía no eligió el horario"}</p>
        <p className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-accent" /> <span><strong>{p?.name}</strong><br />{p?.address}</span></p>
        {p?.access_code && <p className="flex items-center gap-2"><KeyRound size={16} className="text-accent" /> Acceso: <strong>{p.access_code}</strong></p>}
        {p?.access_instructions && <p className="text-muted">{p.access_instructions}</p>}
        {p?.manager_contact && <p className="flex items-center gap-2"><Phone size={16} className="text-accent" /> Administración: {p.manager_contact}</p>}
        {v.description && <p className="rounded-xl bg-surface-muted p-3">“{v.description}”</p>}
      </Card>

      {(v.status === "assigned" || v.status === "scheduled") && (
        <form action={startVisit.bind(null, v.id)}>
          <Button className="w-full py-3">Llegué, empezar trabajo</Button>
        </form>
      )}
      {v.status === "in_progress" && (
        <form action={finishVisit.bind(null, v.id)} className="flex flex-col gap-3">
          <Field label="¿Qué hiciste?" hint="Le llega al administrador">
            <Textarea name="notes" placeholder="Cambié el cuerito de la canilla, quedó sin pérdida" />
          </Field>
          <Button className="w-full py-3">Marcar resuelta</Button>
        </form>
      )}
      {v.status === "resolved" && <p className="rounded-2xl bg-ok-soft p-4 text-center text-ok">✓ Trabajo terminado. ¡Gracias!{v.resolution_notes && <span className="mt-1 block text-sm">{v.resolution_notes}</span>}</p>}
    </>
  );
}
