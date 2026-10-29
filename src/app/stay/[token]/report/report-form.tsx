"use client";

import { useActionState, useState } from "react";
import { Button, Field, Select, Textarea } from "@/components/ui";
import { SERVICE_LABEL } from "@/lib/types";
import { reportProblem } from "../actions";

export function ReportForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(reportProblem.bind(null, token), undefined);
  const [category, setCategory] = useState("maintenance");
  return (
    <form action={action} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
      <Field label="¿Qué pasa?">
        <Select name="category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="maintenance">Algo no funciona (aire, agua, luz, electrodomésticos…)</option>
          <option value="access">No puedo entrar / problema con llaves</option>
          <option value="cleaning">Limpieza</option>
          <option value="amenities">Faltan cosas (toallas, papel, etc.)</option>
          <option value="noise">Ruidos o vecinos</option>
          <option value="other">Otra cosa</option>
        </Select>
      </Field>
      {(category === "maintenance" || category === "access") && (
        <Field label="¿Qué tipo de problema?" hint="Así le pedimos presupuesto al profesional indicado">
          <Select name="service" defaultValue={category === "access" ? "locksmith" : "plumbing"} key={category}>
            {Object.entries(SERVICE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Contanos más">
        <Textarea name="description" required minLength={5} placeholder="Ej: el aire acondicionado del living no enfría" />
      </Field>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="urgent" className="size-5 accent-[var(--danger)]" />
        Es urgente (no puedo usar el alojamiento con normalidad)
      </label>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button disabled={pending}>Enviar reporte</Button>
    </form>
  );
}
