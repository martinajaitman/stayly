import clsx from "clsx";
import Link from "next/link";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { IncidentStatusBadge, PriorityBadge } from "@/components/status";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { formatDateTime, formatMoney } from "@/lib/format";
import { FundCard } from "@/components/fund-card";
import { getFundStatus } from "@/lib/automation/maintenance";
import { requireAdmin } from "@/lib/session";
import { daysAgoIso } from "@/lib/time";
import {
  INCIDENT_CATEGORY_LABEL,
  INCIDENT_STATUS_LABEL,
  ROLE_LABEL,
  TASK_STATUS_LABEL,
  type Incident,
  type IncidentStatus,
  type Profile,
  type Task,
  type TaskStatus,
} from "@/lib/types";
import { assignIncident, assignTask, moveIncident, moveTask } from "./actions";
import { NewIncidentForm } from "./new-incident-form";

type TaskRow = Task & { properties: { name: string } | null };
type IncidentRow = Incident & { properties: { name: string } | null };

const TASK_FLOW: TaskStatus[] = ["pending", "in_progress", "done"];
// Columnas del tablero: los estados del flujo de presupuestos se agrupan.
const INCIDENT_COLUMNS: { title: string; statuses: IncidentStatus[] }[] = [
  { title: "Pendiente", statuses: ["pending"] },
  { title: "Presupuestos", statuses: ["quoting", "awaiting_approval"] },
  { title: "Asignada", statuses: ["assigned", "scheduled"] },
  { title: "En proceso", statuses: ["in_progress"] },
  { title: "Resuelta", statuses: ["resolved"] },
];
// Avance manual, solo para incidencias sin flujo de presupuestos.
const MANUAL_NEXT: Partial<Record<IncidentStatus, IncidentStatus>> = { pending: "assigned", assigned: "in_progress", in_progress: "resolved" };
const REPORTED_BY: Record<string, string> = { guest: "huésped", admin: "administración", staff: "personal", ai: "asistente IA" };

function Column({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="flex min-w-64 flex-1 flex-col gap-3">
      <h2 className="text-sm font-medium text-muted">{title} · {count}</h2>
      {children}
    </section>
  );
}

function NextStep({ action, label }: { action: () => Promise<void>; label: string }) {
  return (
    <form action={action}>
      <Button variant="secondary" className="w-full py-1.5 text-xs">{label}</Button>
    </form>
  );
}

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const { tab: rawTab } = await searchParams;
  const tab = rawTab === "incidents" ? "incidents" : "cleaning";
  const { supabase, org } = await requireAdmin();
  const tz = org.timezone;
  const since = daysAgoIso(7);

  const [{ data: tasks }, { data: incidents }, { data: profiles }, { data: properties }, fund] = await Promise.all([
    supabase.from("tasks").select("*, properties(name)").eq("type", "cleaning").or(`status.neq.done,completed_at.gte.${since}`).order("scheduled_for"),
    supabase.from("incidents").select("*, properties(name)").or(`status.neq.resolved,resolved_at.gte.${since}`).order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, role").order("full_name"),
    supabase.from("properties").select("id, name").order("name"),
    getFundStatus(org.id),
  ]);
  const taskRows = (tasks ?? []) as TaskRow[];
  const incidentRows = (incidents ?? []) as IncidentRow[];
  const people = (profiles ?? []) as Pick<Profile, "id" | "full_name" | "role">[];
  const staff = people.map((p) => ({ value: p.id, label: `${p.full_name || "Sin nombre"} (${ROLE_LABEL[p.role]})` }));
  const openIncidents = incidentRows.filter((i) => i.status !== "resolved").length;

  return (
    <>
      <PageHeader
        title="Tareas"
        subtitle="Limpiezas e incidencias de todas las propiedades"
        actions={tab === "incidents" && <NewIncidentForm properties={properties ?? []} staff={staff.map((s) => ({ id: s.value, label: s.label }))} />}
      />
      <div className="mb-5 flex gap-2">
        {[
          { key: "cleaning", label: `Limpiezas (${taskRows.filter((t) => t.status !== "done").length})` },
          { key: "incidents", label: `Incidencias (${openIncidents})` },
        ].map((t) => (
          <Link key={t.key} href={`/tasks?tab=${t.key}`} className={clsx("rounded-full px-3 py-1 text-sm", t.key === tab ? "bg-foreground text-background" : "bg-surface-muted")}>
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "incidents" && <div className="mb-5 max-w-md"><FundCard fund={fund} /></div>}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {tab === "cleaning"
          ? TASK_FLOW.map((status, idx) => {
              const rows = taskRows.filter((t) => t.status === status);
              const next = TASK_FLOW[idx + 1];
              return (
                <Column key={status} title={TASK_STATUS_LABEL[status]} count={rows.length}>
                  {rows.map((t) => (
                    <Card key={t.id} className="flex flex-col gap-3 p-4">
                      <div>
                        <p className="font-medium">{t.properties?.name}</p>
                        <p className="text-xs text-muted">
                          {t.status === "done" && t.completed_at
                            ? `Terminada ${formatDateTime(t.completed_at, tz)}`
                            : t.scheduled_for && `Desde ${formatDateTime(t.scheduled_for, tz)}`}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Checklist {t.checklist.filter((c) => c.done).length}/{t.checklist.length}
                          {t.photos.length > 0 && ` · ${t.photos.length} foto(s)`}
                        </p>
                        {t.notes && <p className="mt-2 text-xs">“{t.notes}”</p>}
                      </div>
                      <AutoSubmitSelect
                        label="Asignar a"
                        action={assignTask.bind(null, t.id)}
                        defaultValue={t.assigned_to ?? ""}
                        options={staff}
                        placeholder="Sin asignar"
                      />
                      {next && <NextStep action={moveTask.bind(null, t.id, next)} label={`Pasar a ${TASK_STATUS_LABEL[next].toLowerCase()}`} />}
                    </Card>
                  ))}
                </Column>
              );
            })
          : INCIDENT_COLUMNS.map((column) => {
              const rows = incidentRows.filter((i) => column.statuses.includes(i.status));
              return (
                <Column key={column.title} title={column.title} count={rows.length}>
                  {rows.map((i) => {
                    const next = i.selected_quote_id || i.status === "quoting" || i.status === "awaiting_approval" ? undefined : MANUAL_NEXT[i.status];
                    return (
                    <Card key={i.id} className={clsx("flex flex-col gap-3 p-4", i.status === "awaiting_approval" && "border-danger")}>
                      <Link href={`/tasks/incidents/${i.id}`} className="block">
                        <p className="text-xs text-muted">#{i.number} · {i.properties?.name}</p>
                        <p className="font-medium hover:text-accent">{i.title}</p>
                        {i.description && <p className="mt-1 text-xs text-muted">{i.description}</p>}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <PriorityBadge priority={i.priority} />
                          {column.statuses.length > 1 && <IncidentStatusBadge status={i.status} />}
                          {i.approved_amount != null && <Badge tone="green">{formatMoney(i.approved_amount)}</Badge>}
                        </div>
                        <p className="mt-2 text-xs text-muted">
                          {INCIDENT_CATEGORY_LABEL[i.category]} · reportado por {REPORTED_BY[i.reported_by] ?? i.reported_by} · {formatDateTime(i.created_at, tz)}
                        </p>
                      </Link>
                      {i.status === "pending" && (
                        <AutoSubmitSelect
                          label="Asignar a"
                          action={assignIncident.bind(null, i.id)}
                          defaultValue={i.assigned_to ?? ""}
                          options={staff}
                          placeholder="Sin asignar"
                        />
                      )}
                      {next && <NextStep action={moveIncident.bind(null, i.id, next)} label={`Pasar a ${INCIDENT_STATUS_LABEL[next].toLowerCase()}`} />}
                      {i.status === "awaiting_approval" && (
                        <Link href={`/tasks/incidents/${i.id}`} className="rounded-xl bg-accent py-1.5 text-center text-xs font-medium text-white">Ver presupuestos y aprobar</Link>
                      )}
                    </Card>
                    );
                  })}
                </Column>
              );
            })}
      </div>
    </>
  );
}
