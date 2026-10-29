import Link from "next/link";
import { Clock, ListChecks, MapPin } from "lucide-react";
import { IncidentStatusBadge, PriorityBadge, TaskStatusBadge } from "@/components/status";
import { Button, Card, EmptyState } from "@/components/ui";
import { getSession } from "@/lib/session";
import { addDays, toZonedDay, toZonedTime, zonedToUtc } from "@/lib/time";
import type { Incident, Task } from "@/lib/types";
import { setMyIncidentStatus } from "../actions";
import { ProHome } from "./pro-home";

type TaskRow = Task & { properties: { name: string; address: string } | null };
type IncidentRow = Incident & { properties: { name: string; address: string } | null };

export default async function TodayPage({ searchParams }: PageProps<"/today">) {
  const session = await getSession();
  if (session.profile.role === "maintenance") return <ProHome sent={(await searchParams).sent === "1"} />;
  const { supabase, profile, org } = session;
  const tz = org.timezone;
  const today = toZonedDay(new Date(), tz);
  const tomorrowStart = zonedToUtc(addDays(today, 1), "00:00", tz).toISOString();
  const todayStart = zonedToUtc(today, "00:00", tz).toISOString();

  const [{ data: tasks }, { data: incidents }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, properties(name, address)")
      .eq("assigned_to", profile.id)
      // Pendientes de hoy o atrasadas, y las terminadas hoy.
      .or(`and(status.neq.done,scheduled_for.lt.${tomorrowStart}),and(status.eq.done,completed_at.gte.${todayStart})`)
      .order("scheduled_for"),
    supabase
      .from("incidents")
      .select("*, properties(name, address)")
      .eq("assigned_to", profile.id)
      .neq("status", "resolved")
      .order("priority", { ascending: false }),
  ]);
  const myTasks = (tasks ?? []) as TaskRow[];
  const myIncidents = (incidents ?? []) as IncidentRow[];
  const open = myTasks.filter((t) => t.status !== "done").length;

  return (
    <>
      <h1 className="text-2xl font-semibold">Hola, {profile.full_name.split(" ")[0] || "equipo"}</h1>
      <p className="mb-5 text-muted">
        {open === 0 ? "No tenés tareas pendientes para hoy" : `${open} ${open === 1 ? "tarea" : "tareas"} para hoy`}
      </p>

      <div className="flex flex-col gap-3">
        {myTasks.length === 0 && myIncidents.length === 0 && <EmptyState>Cuando te asignen una tarea va a aparecer acá.</EmptyState>}
        {myTasks.map((t) => {
          const done = t.checklist.filter((c) => c.done).length;
          return (
            <Card key={t.id} className={t.status === "done" ? "opacity-70" : ""}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold">{t.properties?.name}</h2>
                <TaskStatusBadge status={t.status} />
              </div>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                {t.status === "done" ? (
                  <>✓ Completada a las {t.completed_at && toZonedTime(new Date(t.completed_at), tz)}</>
                ) : t.status === "in_progress" ? (
                  <><ListChecks size={15} /> {done} de {t.checklist.length} ítems completos</>
                ) : (
                  <><Clock size={15} /> Limpieza desde las {t.scheduled_for ? toZonedTime(new Date(t.scheduled_for), tz) : "—"}
                    {t.scheduled_for && toZonedDay(new Date(t.scheduled_for), tz) < today && " (atrasada)"}</>
                )}
              </p>
              {t.status !== "done" && (
                <Link href={`/today/${t.id}`} className="mt-4 block rounded-xl border border-border py-3 text-center font-medium hover:bg-surface-muted">
                  {t.status === "pending" ? "Iniciar tarea" : "Continuar checklist"}
                </Link>
              )}
            </Card>
          );
        })}

        {myIncidents.length > 0 && <h2 className="mt-4 text-sm font-medium text-muted">Incidencias asignadas</h2>}
        {myIncidents.map((i) => (
          <Card key={i.id}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold">#{i.number} · {i.title}</h3>
              <IncidentStatusBadge status={i.status} />
            </div>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted"><MapPin size={14} /> {i.properties?.name}{i.properties?.address && ` · ${i.properties.address}`}</p>
            {i.description && <p className="mt-3 text-sm">{i.description}</p>}
            <div className="mt-3"><PriorityBadge priority={i.priority} /></div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {i.status !== "in_progress" && (
                <form action={setMyIncidentStatus.bind(null, i.id, "in_progress")}><Button variant="secondary" className="w-full">Empezar</Button></form>
              )}
              <form action={setMyIncidentStatus.bind(null, i.id, "resolved")} className={i.status === "in_progress" ? "col-span-2" : ""}>
                <Button className="w-full">Marcar resuelta</Button>
              </form>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
