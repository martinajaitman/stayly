"use client";

import { useActionState } from "react";
import { Button, Field, Select, Textarea } from "@/components/ui";
import { reportProblem } from "../actions";

export function ReportForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(reportProblem.bind(null, token), undefined);
  return (
    <form action={action} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
      <Field label="¿Qué pasa?">
        <Select name="category" defaultValue="maintenance">
          <option value="maintenance">Algo no funciona (aire, agua, luz, electrodomésticos…)</option>
          <option value="access">No puedo entrar / problema con llaves</option>
          <option value="cleaning">Limpieza</option>
          <option value="amenities">Faltan cosas (toallas, papel, etc.)</option>
          <option value="noise">Ruidos o vecinos</option>
          <option value="other">Otra cosa</option>
        </Select>
      </Field>
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
