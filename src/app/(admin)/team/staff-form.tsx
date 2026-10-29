"use client";

import { useActionState, useState } from "react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { SERVICE_LABEL } from "@/lib/types";
import { createStaff } from "./actions";

export function StaffForm() {
  const [state, action, pending] = useActionState(createStaff, undefined);
  const [role, setRole] = useState("cleaner");
  return (
    <Card>
      <h2 className="font-semibold">Agregar persona</h2>
      <p className="mt-1 text-sm text-muted">Entra a la app desde el celular con su email y contraseña y ve solo su trabajo.</p>
      <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Nombre">
          <Input name="full_name" required />
        </Field>
        <Field label="Rol">
          <Select name="role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="cleaner">Limpieza</option>
            <option value="maintenance">Profesional (técnico)</option>
            <option value="admin">Administrador</option>
          </Select>
        </Field>
        {role === "maintenance" && (
          <>
            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-sm font-medium">Rubros</legend>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SERVICE_LABEL).map(([v, l]) => (
                  <label key={v} className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm has-checked:border-accent has-checked:bg-accent-soft has-checked:text-accent">
                    <input type="checkbox" name="specialties" value={v} className="sr-only" />
                    {l}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Zona" hint="Barrios donde trabaja">
              <Input name="zone" placeholder="Palermo, Belgrano, Recoleta" />
            </Field>
            <Field label="Teléfono">
              <Input name="phone" type="tel" placeholder="+54 9 11 …" />
            </Field>
          </>
        )}
        <Field label="Email">
          <Input name="email" type="email" required autoComplete="off" />
        </Field>
        <Field label="Contraseña inicial" hint="Mínimo 8 caracteres. Pasásela por WhatsApp.">
          <Input name="password" type="text" required minLength={8} autoComplete="off" />
        </Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button disabled={pending}>Agregar</Button>
          {state?.error && <p className="text-sm text-danger">{state.error}</p>}
          {state?.ok && <p className="text-sm text-ok">{state.ok}</p>}
        </div>
      </form>
    </Card>
  );
}
