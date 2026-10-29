"use client";

import clsx from "clsx";
import { useOptimistic, useState, useTransition } from "react";
import { Camera, Check } from "lucide-react";
import { Button, Field, Textarea } from "@/components/ui";
import { compressImage } from "@/lib/compress-image";
import type { ChecklistItem, TaskStatus } from "@/lib/types";
import { addTaskPhoto, finishTask, saveTaskNotes, startTask, toggleChecklistItem } from "../../actions";

export function TaskRunner({
  taskId,
  status,
  checklist,
  photoUrls,
  notes,
}: {
  taskId: string;
  status: TaskStatus;
  checklist: ChecklistItem[];
  photoUrls: string[];
  notes: string;
}) {
  const [pending, start] = useTransition();
  const [items, setItem] = useOptimistic(checklist, (state, { index, done }: { index: number; done: boolean }) =>
    state.map((item, i) => (i === index ? { ...item, done } : item)),
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const completed = items.filter((i) => i.done).length;
  const allDone = completed === items.length;

  if (status === "pending") {
    return (
      <Button className="w-full py-4 text-base" disabled={pending} onClick={() => start(() => startTask(taskId))}>
        Iniciar tarea
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Checklist</h2>
          <span className="text-sm text-muted">{completed} de {items.length}</span>
        </div>
        <ul className="flex flex-col">
          {items.map((item, index) => (
            <li key={index}>
              <button
                type="button"
                disabled={status === "done"}
                onClick={() =>
                  start(async () => {
                    setItem({ index, done: !item.done });
                    await toggleChecklistItem(taskId, index, !item.done);
                  })
                }
                className="flex w-full items-center gap-3 border-b border-border py-3 text-left last:border-0"
              >
                <span className={clsx("grid size-6 shrink-0 place-items-center rounded-md border-2", item.done ? "border-ok bg-ok text-white" : "border-border")}>
                  {item.done && <Check size={14} strokeWidth={3} />}
                </span>
                <span className={clsx(item.done && "text-muted line-through")}>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 font-semibold">Fotos</h2>
        <div className="grid grid-cols-3 gap-2">
          {photoUrls.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="Foto de la limpieza" className="aspect-square w-full rounded-lg object-cover" />
          ))}
          {status !== "done" && (
            <label className="grid aspect-square cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border text-muted">
              {uploading ? <span className="text-xs">Subiendo…</span> : <Camera />}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  const data = new FormData();
                  data.set("photo", await compressImage(file));
                  const r = await addTaskPhoto(taskId, data);
                  setUploading(false);
                  if (r.error) setMsg(r.error);
                }}
              />
            </label>
          )}
        </div>
      </section>

      {status !== "done" && (
        <form
          className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
          action={async (data) => {
            const r = await saveTaskNotes(taskId, data);
            setMsg(r.ok ?? r.error ?? null);
          }}
        >
          <h2 className="font-semibold">Observaciones</h2>
          <Field label="Notas" hint="Reposición de amenities, algo para el próximo turno…">
            <Textarea name="notes" defaultValue={notes} />
          </Field>
          <Field label="¿Encontraste algún daño?" hint="Si escribís algo se crea una incidencia para el administrador.">
            <Textarea name="damage" placeholder="Ej: mancha en el sillón, vaso roto" />
          </Field>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" name="urgent" className="size-5" /> Es urgente (impide recibir al próximo huésped)
          </label>
          <Button variant="secondary">Guardar observaciones</Button>
        </form>
      )}

      {msg && <p className="text-sm text-ok">{msg}</p>}

      {status === "in_progress" && (
        <Button className="w-full py-4 text-base" disabled={pending || !allDone} onClick={() => start(() => finishTask(taskId))}>
          {allDone ? "Finalizar tarea" : `Completá el checklist (${completed}/${items.length})`}
        </Button>
      )}
      {status === "done" && <p className="rounded-2xl bg-ok-soft p-4 text-center text-ok">✓ Tarea finalizada. ¡Gracias!</p>}
    </div>
  );
}
