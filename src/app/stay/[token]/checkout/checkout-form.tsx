"use client";

import { useActionState } from "react";
import { Button, Field, Textarea } from "@/components/ui";
import { guestCheckout } from "../actions";

export function CheckoutForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(guestCheckout.bind(null, token), undefined);
  return (
    <form action={action} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
      <Field label="¿Algo para reportar?" hint="Opcional: algo roto, algo que falte, un comentario.">
        <Textarea name="comment" />
      </Field>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button disabled={pending}>Confirmar check-out</Button>
    </form>
  );
}
