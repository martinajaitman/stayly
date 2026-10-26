"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import type { FaqItem, Property, Recommendation } from "@/lib/types";
import { saveProperty } from "./actions";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

export function PropertyForm({ property }: { property?: Property }) {
  const [state, action, pending] = useActionState(saveProperty.bind(null, property?.id ?? null), undefined);
  const [recs, setRecs] = useState<Recommendation[]>(property?.recommendations ?? []);
  const [faq, setFaq] = useState<FaqItem[]>(property?.faq ?? []);

  return (
    <form action={action} className="flex flex-col gap-5">
      <Section title="Información general">
        <Field label="Nombre" className="sm:col-span-2">
          <Input name="name" required defaultValue={property?.name} placeholder="Depto 4B - Palermo" />
        </Field>
        <Field label="Dirección" className="sm:col-span-2">
          <Input name="address" defaultValue={property?.address} />
        </Field>
        <Field label="Capacidad (personas)">
          <Input name="capacity" type="number" min={1} defaultValue={property?.capacity ?? 2} />
        </Field>
        <Field label="Habitaciones">
          <Input name="bedrooms" type="number" min={0} defaultValue={property?.bedrooms ?? 1} />
        </Field>
        <Field label="Horario de check-in">
          <Input name="checkin_time" type="time" defaultValue={property?.checkin_time?.slice(0, 5) ?? "15:00"} />
        </Field>
        <Field label="Horario de check-out">
          <Input name="checkout_time" type="time" defaultValue={property?.checkout_time?.slice(0, 5) ?? "10:00"} />
        </Field>
        <Field label="Red Wi-Fi">
          <Input name="wifi_ssid" defaultValue={property?.wifi_ssid} />
        </Field>
        <Field label="Contraseña Wi-Fi">
          <Input name="wifi_password" defaultValue={property?.wifi_password} />
        </Field>
        <Field label="Amenities" hint="Separados por coma" className="sm:col-span-2">
          <Input name="amenities" defaultValue={property?.amenities.join(", ")} placeholder="Aire acondicionado, Smart TV, Lavarropas" />
        </Field>
        <Field label="Reglas del alojamiento" className="sm:col-span-2">
          <Textarea name="house_rules" defaultValue={property?.house_rules} placeholder="No se permite fumar. No se aceptan mascotas…" />
        </Field>
      </Section>

      <Section title="Información operativa" description="Solo se le muestra al huésped después del check-in digital.">
        <Field label="Código de acceso">
          <Input name="access_code" defaultValue={property?.access_code} placeholder="4B · 8291" />
        </Field>
        <Field label="Contacto del responsable">
          <Input name="manager_contact" defaultValue={property?.manager_contact} placeholder="+54 9 11 …" />
        </Field>
        <Field label="Instrucciones de acceso" className="sm:col-span-2">
          <Textarea name="access_instructions" defaultValue={property?.access_instructions} />
        </Field>
        <Field label="Llaves" className="sm:col-span-2">
          <Textarea name="keys_info" defaultValue={property?.keys_info} placeholder="Dónde están y dónde dejarlas al salir" />
        </Field>
      </Section>

      <Card>
        <h2 className="font-semibold">Recomendaciones para huéspedes</h2>
        <p className="mt-1 text-sm text-muted">Restaurantes, supermercados, transporte, lugares turísticos. Alimentan al asistente IA.</p>
        <input type="hidden" name="recommendations" value={JSON.stringify(recs)} />
        <div className="mt-4 flex flex-col gap-3">
          {recs.map((r, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[140px_1fr_2fr_auto]">
              <Input placeholder="Categoría" value={r.category} onChange={(e) => setRecs(recs.with(i, { ...r, category: e.target.value }))} />
              <Input placeholder="Nombre" value={r.name} onChange={(e) => setRecs(recs.with(i, { ...r, name: e.target.value }))} />
              <Input placeholder="Descripción" value={r.description} onChange={(e) => setRecs(recs.with(i, { ...r, description: e.target.value }))} />
              <Button type="button" variant="ghost" aria-label="Quitar" onClick={() => setRecs(recs.filter((_, j) => j !== i))}>
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
          <Button type="button" variant="secondary" className="self-start" onClick={() => setRecs([...recs, { category: "", name: "", description: "" }])}>
            <Plus size={16} /> Agregar recomendación
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Preguntas frecuentes</h2>
        <input type="hidden" name="faq" value={JSON.stringify(faq)} />
        <div className="mt-4 flex flex-col gap-3">
          {faq.map((f, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
              <Input placeholder="Pregunta" value={f.question} onChange={(e) => setFaq(faq.with(i, { ...f, question: e.target.value }))} />
              <Input placeholder="Respuesta" value={f.answer} onChange={(e) => setFaq(faq.with(i, { ...f, answer: e.target.value }))} />
              <Button type="button" variant="ghost" aria-label="Quitar" onClick={() => setFaq(faq.filter((_, j) => j !== i))}>
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
          <Button type="button" variant="secondary" className="self-start" onClick={() => setFaq([...faq, { question: "", answer: "" }])}>
            <Plus size={16} /> Agregar pregunta
          </Button>
        </div>
      </Card>

      <Section title="Canales de reserva" description="Pegá el link de exportación de calendario (iCal) de Airbnb y/o Booking.com. Se sincroniza cada 15 minutos.">
        <Field
          label="URLs iCal"
          hint="Una por línea. Airbnb: Calendario → Disponibilidad → Sincronizar calendarios → Exportar. Booking: Tarifas y disponibilidad → Sincronizar calendarios."
          className="sm:col-span-2"
        >
          <Textarea name="ical_urls" defaultValue={property?.ical_urls.join("\n")} placeholder="https://www.airbnb.com/calendar/ical/….ics" />
        </Field>
      </Section>

      <div className="sticky bottom-0 -mx-4 flex items-center gap-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-2xl md:border">
        <Button disabled={pending}>{property ? "Guardar cambios" : "Crear propiedad"}</Button>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        {state?.ok && <p className="text-sm text-ok">{state.ok}</p>}
      </div>
    </form>
  );
}
