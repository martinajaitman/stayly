import clsx from "clsx";
import { redirect } from "next/navigation";
import { Bell, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui";
import { getSession } from "@/lib/session";
import { SERVICE_LABEL, type ServiceType } from "@/lib/types";
import { saveAvailability } from "../../pro-actions";
import { ProTabs } from "../pro-tabs";

const DAYS = [
  { n: 1, label: "Lun" },
  { n: 2, label: "Mar" },
  { n: 3, label: "Mié" },
  { n: 4, label: "Jue" },
  { n: 5, label: "Vie" },
  { n: 6, label: "Sáb" },
  { n: 0, label: "Dom" },
];

export default async function AvailabilityPage({ searchParams }: PageProps<"/today/availability">) {
  const { saved } = await searchParams;
  const { supabase, profile } = await getSession();
  if (profile.role !== "maintenance") redirect("/today");
  const [{ data }, { data: me }] = await Promise.all([
    supabase.from("professional_availability").select("weekday, slot").eq("profile_id", profile.id),
    supabase.from("profiles").select("specialties").eq("id", profile.id).single(),
  ]);
  const on = new Set((data ?? []).map((a) => `${a.weekday}:${a.slot}`));
  const specialties = ((me?.specialties ?? []) as ServiceType[]).map((s) => SERVICE_LABEL[s]).join(", ");

  return (
    <>
      <h1 className="text-2xl font-semibold">Hola, {profile.full_name.split(" ")[0]}</h1>
      <p className="mb-4 text-muted">{specialties || "Sin rubros cargados"}</p>
      <ProTabs active="availability" />
      <form action={saveAvailability} className="flex flex-col gap-4">
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="flex items-center gap-2 font-semibold"><CalendarDays size={18} className="text-accent" /> Tu disponibilidad</h2>
          <p className="mt-1 text-sm text-muted">Marcá los bloques en los que podés atender. Nosotros nos encargamos de coordinar con el huésped.</p>
          <div className="mt-4 grid grid-cols-[64px_repeat(7,1fr)] gap-1.5 text-center text-xs">
            <span />
            {DAYS.map((d) => <span key={d.n} className="text-muted">{d.label}</span>)}
            {(["morning", "afternoon"] as const).map((slot) => (
              <div key={slot} className="contents">
                <span className="self-center text-left text-muted">{slot === "morning" ? "Mañana" : "Tarde"}</span>
                {DAYS.map((d) => (
                  <label key={d.n} className="cursor-pointer">
                    <input type="checkbox" name="cell" value={`${d.n}:${slot}`} defaultChecked={on.has(`${d.n}:${slot}`)} className="peer sr-only" />
                    <span className={clsx("block h-9 rounded-lg border border-border peer-checked:border-accent peer-checked:bg-accent-soft")} />
                  </label>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted"><span className="inline-block size-3 rounded bg-accent-soft" /> Disponible para asignar · Mañana 10 a 12 h · Tarde 17 a 19 h</p>
        </section>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
          <Bell size={18} className="text-accent" />
          <div>
            <p className="font-medium">Avisos en la app</p>
            <p className="text-muted">Te llega el pedido y el turno asignado, no hace falta llamar a nadie.</p>
          </div>
        </div>
        {saved === "1" && <p className="text-sm text-ok">✓ Disponibilidad guardada.</p>}
        <Button className="py-3">Guardar disponibilidad</Button>
      </form>
    </>
  );
}
