import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, KeyRound, MapPin } from "lucide-react";
import { TaskStatusBadge } from "@/components/status";
import { getSession } from "@/lib/session";
import { signedUrls } from "@/lib/storage";
import { toZonedTime } from "@/lib/time";
import type { Task } from "@/lib/types";
import { TaskRunner } from "./task-runner";

type Row = Task & { properties: { name: string; address: string; access_code: string; access_instructions: string } | null };

export default async function TaskPage({ params }: PageProps<"/today/[taskId]">) {
  const { taskId } = await params;
  const { supabase, org } = await getSession();
  const { data } = await supabase
    .from("tasks")
    .select("*, properties(name, address, access_code, access_instructions)")
    .eq("id", taskId)
    .maybeSingle();
  if (!data) notFound();
  const t = data as Row;
  const photos = await signedUrls("task-photos", t.photos);

  return (
    <>
      <Link href="/today" className="mb-4 inline-flex items-center gap-1 text-sm text-muted"><ChevronLeft size={16} /> Mis tareas</Link>
      <div className="mb-1 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t.properties?.name}</h1>
        <TaskStatusBadge status={t.status} />
      </div>
      <p className="flex items-center gap-1 text-sm text-muted"><MapPin size={14} /> {t.properties?.address}</p>
      <p className="mb-4 text-sm text-muted">
        {t.type === "cleaning" ? "Limpieza" : "Mantenimiento"}
        {t.scheduled_for && ` · desde las ${toZonedTime(new Date(t.scheduled_for), org.timezone)}`}
      </p>
      {t.properties?.access_code && (
        <div className="mb-4 rounded-2xl bg-accent-soft p-4 text-accent">
          <p className="flex items-center gap-2 text-sm"><KeyRound size={16} /> Acceso: <strong>{t.properties.access_code}</strong></p>
          {t.properties.access_instructions && <p className="mt-1 text-xs opacity-80">{t.properties.access_instructions}</p>}
        </div>
      )}
      <TaskRunner taskId={t.id} status={t.status} checklist={t.checklist} photoUrls={photos} notes={t.notes} />
    </>
  );
}
