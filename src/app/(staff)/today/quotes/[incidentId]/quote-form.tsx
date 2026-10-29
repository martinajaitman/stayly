"use client";

import { useActionState } from "react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { sendQuote } from "../../../pro-actions";

export function QuoteForm({
  incidentId,
  slots,
  initial,
}: {
  incidentId: string;
  slots: { iso: string; label: string }[];
  initial: { repair: number | null; replace: number | null; notes: string; slots: string[] } | null;
}) {
  const [state, action, pending] = useActionState(sendQuote.bind(null, incidentId), undefined);
  const chosen = new Set(initial?.slots.map((s) => new Date(s).getTime()));
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Arreglar ($)" hint="Dejalo vacío si no corresponde">
          <Input name="repair_amount" inputMode="numeric" placeholder="35.000" defaultValue={initial?.repair ?? ""} />
        </Field>
        <Field label="Reemplazar ($)" hint="Con materiales">
          <Input name="replace_amount" inputMode="numeric" placeholder="90.000" defaultValue={initial?.replace ?? ""} />
        </Field>
      </div>
      <Field label="Detalle (opcional)">
        <Textarea name="notes" placeholder="Qué incluye, materiales, garantía…" defaultValue={initial?.notes} />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">¿Cuándo podés ir? (el huésped elige uno)</legend>
        {slots.map((s) => (
          <label key={s.iso} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm has-checked:border-accent has-checked:bg-accent-soft">
            <input type="checkbox" name="slot" value={s.iso} defaultChecked={chosen.has(new Date(s.iso).getTime())} className="size-4" />
            {s.label}
          </label>
        ))}
        {slots.length === 0 && <p className="text-sm text-muted">No hay turnos en tu disponibilidad para los próximos días. Actualizala en «Mi disponibilidad».</p>}
      </fieldset>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button disabled={pending} className="py-3">{initial ? "Actualizar presupuesto" : "Enviar presupuesto"}</Button>
    </form>
  );
}
