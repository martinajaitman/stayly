import { CalendarCheck, Search, Wrench } from "lucide-react";
import { Button } from "@/components/ui";
import type { GuestIncident } from "@/lib/portal";
import { formatSlot } from "@/lib/slots";
import { pickVisitSlot } from "./actions";

/** Estado del reporte del huésped y elección del horario del técnico. */
export function VisitCard({ token, incident: i, timeZone }: { token: string; incident: GuestIncident; timeZone: string }) {
  if (i.status === "quoting" || i.status === "awaiting_approval" || i.status === "pending") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
        <Search size={20} className="mt-0.5 shrink-0 text-accent" />
        <div>
          <p className="font-medium">{i.title}</p>
          <p className="text-sm text-muted">Reporte #{i.number} · Estamos buscando un técnico disponible. Te avisamos acá.</p>
        </div>
      </div>
    );
  }
  if (i.status === "assigned" && !i.visit_at) {
    return (
      <div className="rounded-2xl border-2 border-accent bg-surface p-4">
        <p className="flex items-center gap-2 font-medium"><Wrench size={18} className="text-accent" /> Ya encontramos un técnico</p>
        <p className="mt-1 text-sm text-muted">
          {i.professional} va a resolver «{i.title}». No hace falta que hagas nada más: solo elegí el horario que te quede mejor.
        </p>
        <form action={pickVisitSlot.bind(null, token, i.id)} className="mt-3 flex flex-col gap-2">
          {i.slots.map((s, idx) => (
            <label key={s} className="flex cursor-pointer items-center justify-between rounded-xl border border-border px-4 py-3 text-sm has-checked:border-accent has-checked:bg-accent-soft">
              {formatSlot(s, timeZone)}
              <input type="radio" name="slot" value={s} defaultChecked={idx === 0} className="accent-[var(--accent)]" />
            </label>
          ))}
          {i.slots.length > 0 ? (
            <Button className="mt-1">Confirmar horario</Button>
          ) : (
            <p className="text-sm text-muted">El equipo te va a proponer un horario.</p>
          )}
        </form>
      </div>
    );
  }
  if (i.status === "scheduled" || i.status === "in_progress") {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-ok-soft p-4 text-ok">
        <CalendarCheck size={20} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Visita confirmada{i.visit_at && ` · ${formatSlot(i.visit_at, timeZone)}`}</p>
          <p className="text-sm">{i.professional} viene por «{i.title}». El técnico ya recibió el turno.</p>
        </div>
      </div>
    );
  }
  return (
    <p className="rounded-2xl bg-ok-soft px-4 py-3 text-sm text-ok">✓ «{i.title}» quedó resuelto. ¡Gracias por avisarnos!</p>
  );
}
