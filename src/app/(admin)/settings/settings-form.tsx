"use client";

import { useActionState } from "react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { saveSettings } from "./actions";

export function SettingsForm({ name, fund, cap, window }: { name: string; fund: number; cap: number; window: number }) {
  const [state, action, pending] = useActionState(saveSettings, undefined);
  return (
    <form action={action} className="flex flex-col gap-5">
      <Card className="grid gap-4">
        <h2 className="font-semibold">Organización</h2>
        <Field label="Nombre">
          <Input name="name" defaultValue={name} />
        </Field>
      </Card>
      <Card className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <h2 className="font-semibold">Incidencias y profesionales</h2>
          <p className="mt-1 text-sm text-muted">
            Cuando un huésped reporta algo, pedimos presupuesto a tus profesionales de ese rubro y te recomendamos el más barato que entre en el
            tope y en el pozo. Nada se asigna sin tu confirmación.
          </p>
        </div>
        <Field label="Pozo mensual para incidencias ($)" hint="Se renueva el 1 de cada mes. 0 = sin pozo.">
          <Input name="monthly_incident_fund" inputMode="numeric" defaultValue={fund || ""} placeholder="300000" />
        </Field>
        <Field label="Tope por incidencia ($)" hint="Lo podés cambiar en cada incidencia. 0 = sin tope.">
          <Input name="default_incident_cap" inputMode="numeric" defaultValue={cap || ""} placeholder="60000" />
        </Field>
        <Field label="Tiempo para cotizar" hint="Pasado este plazo te recomendamos entre los que cotizaron.">
          <Select name="quote_window_minutes" defaultValue={String(window)}>
            {[[30, "30 minutos"], [60, "1 hora"], [120, "2 horas"], [240, "4 horas"], [720, "12 horas"], [1440, "24 horas"]].map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </Field>
      </Card>
      <div className="flex items-center gap-3">
        <Button disabled={pending}>Guardar</Button>
        {state?.ok && <p className="text-sm text-ok">{state.ok}</p>}
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      </div>
    </form>
  );
}
