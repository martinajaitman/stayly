"use client";

import { useActionState } from "react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { createReservation } from "../actions";

export function ReservationForm({ properties, defaultPropertyId }: { properties: { id: string; name: string }[]; defaultPropertyId?: string }) {
  const [state, action, pending] = useActionState(createReservation, undefined);
  return (
    <form action={action} className="flex flex-col gap-5">
      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label="Propiedad" className="sm:col-span-2">
          <Select name="property_id" required defaultValue={defaultPropertyId ?? ""}>
            <option value="" disabled>Elegí una propiedad</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Llegada">
          <Input name="check_in_day" type="date" required />
        </Field>
        <Field label="Salida">
          <Input name="check_out_day" type="date" required />
        </Field>
        <Field label="Canal">
          <Select name="channel" defaultValue="direct">
            <option value="direct">Directa</option>
            <option value="airbnb">Airbnb</option>
            <option value="booking">Booking.com</option>
            <option value="other">Otro</option>
          </Select>
        </Field>
        <Field label="Huéspedes">
          <Input name="guests_count" type="number" min={1} defaultValue={2} />
        </Field>
        <Field label="Código de reserva" hint="Opcional">
          <Input name="confirmation_code" />
        </Field>
      </Card>
      <Card className="grid gap-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Huésped</h2>
        <Field label="Nombre y apellido" className="sm:col-span-2">
          <Input name="full_name" />
        </Field>
        <Field label="WhatsApp" hint="Con código de país: +54 9 11 …">
          <Input name="phone" type="tel" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" />
        </Field>
        <Field label="Notas" className="sm:col-span-2">
          <Textarea name="notes" />
        </Field>
      </Card>
      <div className="flex items-center gap-4">
        <Button disabled={pending}>Crear reserva</Button>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      </div>
    </form>
  );
}
