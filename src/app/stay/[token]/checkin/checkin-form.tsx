"use client";

import clsx from "clsx";
import { useActionState, useRef, useState, useTransition } from "react";
import { Camera, Check } from "lucide-react";
import { Button, Field, Input, Select } from "@/components/ui";
import { compressImage } from "@/lib/compress-image";
import type { Guest } from "@/lib/types";
import { registerGuest } from "../actions";

function Step({ n, title, active, done, children }: { n: number; title: string; active: boolean; done: boolean; children: React.ReactNode }) {
  return (
    <section className={clsx("rounded-2xl border border-border bg-surface p-4", !active && "opacity-60")}>
      <h2 className="flex items-center gap-3 font-medium">
        <span className={clsx("grid size-7 place-items-center rounded-full text-sm text-white", done ? "bg-ok" : "bg-accent")}>
          {done ? <Check size={16} /> : n}
        </span>
        {title}
      </h2>
      {active && <div className="mt-4 flex flex-col gap-4">{children}</div>}
    </section>
  );
}

export function CheckinForm({
  token,
  guest,
  houseRules,
  hasDocument,
  arrival,
}: {
  token: string;
  guest: Guest | null;
  houseRules: string;
  hasDocument: boolean;
  arrival: boolean;
}) {
  const [state, action] = useActionState(registerGuest.bind(null, token), undefined);
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    const small = await compressImage(file);
    setPhoto(small);
    setPreview(URL.createObjectURL(small));
  }

  function next() {
    const form = formRef.current!;
    if (!form.reportValidity()) return;
    if (!photo && !hasDocument) return setLocalError("Sacale una foto a tu documento");
    setLocalError(null);
    setStep(2);
  }

  return (
    <form
      ref={formRef}
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        if (photo) data.set("document_photo", photo);
        startTransition(() => action(data));
      }}
    >
      <Step n={1} title="Tus datos y documento" active={step === 1} done={step > 1}>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface-muted/50 px-4 py-6 text-center text-sm text-muted">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Foto del documento" className="max-h-40 rounded-lg" />
          ) : (
            <Camera className="text-accent" />
          )}
          {preview ? "Tocá para sacar otra foto" : hasDocument ? "Ya tenemos tu documento. Tocá para cambiarlo." : "Sacale una foto al frente de tu DNI o pasaporte"}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
        </label>
        <Field label="Nombre y apellido">
          <Input name="full_name" required minLength={3} defaultValue={guest?.full_name} autoComplete="name" />
        </Field>
        <div className="grid grid-cols-[120px_1fr] gap-3">
          <Field label="Documento">
            <Select name="document_type" defaultValue={guest?.document_type ?? "DNI"}>
              <option>DNI</option>
              <option>Pasaporte</option>
              <option>Otro</option>
            </Select>
          </Field>
          <Field label="Número">
            <Input name="document_number" required minLength={4} defaultValue={guest?.document_number ?? ""} />
          </Field>
        </div>
        <Field label="Nacionalidad">
          <Input name="nationality" required defaultValue={guest?.nationality ?? ""} placeholder="Argentina" />
        </Field>
        <Field label="WhatsApp" hint="Para avisarte cualquier novedad de tu estadía">
          <Input name="phone" type="tel" defaultValue={guest?.phone ?? ""} placeholder="+54 9 11 …" autoComplete="tel" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" defaultValue={guest?.email ?? ""} autoComplete="email" />
        </Field>
        {localError && <p className="text-sm text-danger">{localError}</p>}
        <Button type="button" onClick={next}>Continuar</Button>
      </Step>

      {/* Los campos del paso 2 quedan montados (ocultos) para que el submit los incluya */}
      <Step n={2} title="Normas de la casa" active={step === 2} done={false}>
        <div className="max-h-48 overflow-y-auto rounded-xl bg-surface-muted/60 p-3 text-sm whitespace-pre-line">
          {houseRules || "Respetá el alojamiento y a los vecinos. Ante cualquier problema, reportalo desde este portal."}
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="accept_rules" required className="mt-0.5 size-5 accent-[var(--accent)]" />
          Leí y acepto las normas de la casa y los términos del hospedaje.
        </label>
        <Field label="Firmá escribiendo tu nombre">
          <Input name="signature" required minLength={3} className="font-serif italic" />
        </Field>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <Button disabled={pending}>{pending ? "Enviando…" : arrival ? "Finalizar y ver mi código" : "Finalizar registro"}</Button>
        <button type="button" className="text-sm text-muted" onClick={() => setStep(1)}>Volver</button>
      </Step>
    </form>
  );
}
