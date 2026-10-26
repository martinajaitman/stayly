"use client";

import { useActionState, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import type { Guest } from "@/lib/types";
import { saveGuest, updateReservationTimes } from "../actions";

function Status({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (state?.error) return <p className="text-sm text-danger">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-ok">{state.ok}</p>;
  return null;
}

export function GuestForm({ reservationId, guest }: { reservationId: string; guest: Guest | null }) {
  const [state, action, pending] = useActionState(saveGuest.bind(null, reservationId), undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Nombre y apellido" className="sm:col-span-2">
        <Input name="full_name" required defaultValue={guest?.full_name} />
      </Field>
      <Field label="WhatsApp" hint="Con código de país">
        <Input name="phone" type="tel" defaultValue={guest?.phone ?? ""} placeholder="+54 9 11 …" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" defaultValue={guest?.email ?? ""} />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button disabled={pending} variant="secondary">Guardar huésped</Button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function TimesForm({
  reservationId,
  checkIn,
  checkOut,
}: {
  reservationId: string;
  checkIn: { day: string; time: string };
  checkOut: { day: string; time: string };
}) {
  const [state, action, pending] = useActionState(updateReservationTimes.bind(null, reservationId), undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Llegada">
        <div className="flex gap-2">
          <Input name="check_in_day" type="date" defaultValue={checkIn.day} />
          <Input name="check_in_time" type="time" defaultValue={checkIn.time} className="w-32" />
        </div>
      </Field>
      <Field label="Salida">
        <div className="flex gap-2">
          <Input name="check_out_day" type="date" defaultValue={checkOut.day} />
          <Input name="check_out_time" type="time" defaultValue={checkOut.time} className="w-32" />
        </div>
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button disabled={pending} variant="secondary">Guardar horarios</Button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <Input readOnly value={url} className="font-mono text-xs" />
      <Button
        type="button"
        variant="secondary"
        aria-label="Copiar link"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </Button>
    </div>
  );
}
