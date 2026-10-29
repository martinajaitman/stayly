"use client";

import { useActionState } from "react";
import { Button, Field, Input, Select } from "@/components/ui";
import { SERVICE_LABEL } from "@/lib/types";
import { updateBudget } from "../actions";

export function BudgetForm({ id, cap, service }: { id: string; cap: number | null; service: string | null }) {
  const [state, action, pending] = useActionState(updateBudget.bind(null, id), undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <Field label="Rubro">
        <Select name="service" defaultValue={service ?? ""}>
          <option value="">Sin técnico</option>
          {Object.entries(SERVICE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Field>
      <Field label="Tope para esta incidencia ($)">
        <Input name="budget_cap" inputMode="numeric" defaultValue={cap ?? ""} placeholder="Sin tope" />
      </Field>
      <Button variant="secondary" disabled={pending}>Guardar</Button>
      {state?.ok && <p className="text-sm text-ok sm:col-span-3">{state.ok}</p>}
      {state?.error && <p className="text-sm text-danger sm:col-span-3">{state.error}</p>}
    </form>
  );
}
