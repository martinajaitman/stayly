"use client";

import { useActionState, useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { signIn, signUp } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, action, pending] = useActionState(mode === "signin" ? signIn : signUp, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      {mode === "signup" && (
        <>
          <Field label="Tu nombre">
            <Input name="full_name" required autoComplete="name" />
          </Field>
          <Field label="Nombre de tu empresa o administración">
            <Input name="organization_name" required placeholder="Ej: Palermo Stays" />
          </Field>
        </>
      )}
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Contraseña">
        <Input name="password" type="password" required minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
      </Field>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.message && <p className="text-sm text-ok">{state.message}</p>}
      <Button disabled={pending}>{mode === "signin" ? "Ingresar" : "Crear cuenta"}</Button>
      <button
        type="button"
        className="text-sm text-muted hover:text-foreground"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? "¿No tenés cuenta? Registrate" : "¿Ya tenés cuenta? Ingresá"}
      </button>
    </form>
  );
}
