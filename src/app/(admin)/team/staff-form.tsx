"use client";

import { useActionState } from "react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { createStaff } from "./actions";

export function StaffForm() {
  const [state, action, pending] = useActionState(createStaff, undefined);
  return (
    <Card>
      <h2 className="font-semibold">Agregar persona</h2>
      <p className="mt-1 text-sm text-muted">Entra desde el celular con su email y contraseña y ve solo sus tareas.</p>
      <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Nombre">
          <Input name="full_name" required />
        </Field>
        <Field label="Rol">
          <Select name="role" defaultValue="cleaner">
            <option value="cleaner">Limpieza</option>
            <option value="maintenance">Mantenimiento</option>
            <option value="admin">Administrador</option>
          </Select>
        </Field>
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
