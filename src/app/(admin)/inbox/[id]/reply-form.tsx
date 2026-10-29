"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, Textarea } from "@/components/ui";
import { replyToGuest } from "../actions";

export function ReplyForm({ conversationId }: { conversationId: string }) {
  const [state, action, pending] = useActionState(replyToGuest.bind(null, conversationId), undefined);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!pending && !state?.error) form.current?.reset();
  }, [pending, state]);
  return (
    <form ref={form} action={action} className="flex flex-col gap-2">
      <Textarea name="content" placeholder="Responder al huésped (lo ve en el chat del portal)…" required />
      <div className="flex items-center gap-3">
        <Button disabled={pending}>Enviar respuesta</Button>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      </div>
    </form>
  );
}
