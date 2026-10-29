"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { INCIDENT_CATEGORY_LABEL } from "@/lib/types";
import { createIncidentAdmin } from "./actions";

export function NewIncidentForm({ properties, staff }: { properties: { id: string; name: string }[]; staff: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createIncidentAdmin, undefined);
  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} /> Nueva incidencia
      </Button>
    );
  }
  return (
    <Card className="mb-6 w-full">
      <form action={action} className="grid gap-4 sm:grid-cols-2">
        <Field label="Propiedad">
          <Select name="property_id" required defaultValue="">
            <option value="" disabled>Elegí una propiedad</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Título">
          <Input name="title" required placeholder="Pierde agua la canilla de la cocina" />
        </Field>
        <Field label="Categoría">
          <Select name="category" defaultValue="maintenance">
            {Object.entries(INCIDENT_CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Prioridad" hint="Alta pone la propiedad en mantenimiento">
          <Select name="priority" defaultValue="medium">
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </Select>
        </Field>
        <Field label="Asignar a">
          <Select name="assigned_to" defaultValue="">
            <option value="">Sin asignar</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
        </Field>
        <Field label="Descripción" className="sm:col-span-2">
          <Textarea name="description" />
        </Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button disabled={pending}>Crear incidencia</Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cerrar</Button>
          {state?.error && <p className="text-sm text-danger">{state.error}</p>}
          {state?.ok && <p className="text-sm text-ok">{state.ok}</p>}
        </div>
      </form>
    </Card>
  );
}
