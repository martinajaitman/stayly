import clsx from "clsx";
import Link from "next/link";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

type Row = {
  id: string;
  needs_attention: boolean;
  last_message_at: string;
  reservations: { properties: { name: string } | null; guests: { full_name: string } | null; confirmation_code: string | null } | null;
  messages: { role: string; content: string; created_at: string }[];
};

export default async function InboxPage() {
  const { supabase, org } = await requireAdmin();
  const { data } = await supabase
    .from("conversations")
    .select("id, needs_attention, last_message_at, reservations(confirmation_code, properties(name), guests(full_name)), messages(role, content, created_at)")
    .order("needs_attention", { ascending: false })
    .order("last_message_at", { ascending: false })
    .order("created_at", { referencedTable: "messages", ascending: false })
    .limit(1, { referencedTable: "messages" })
    .limit(100);
  const rows = ((data ?? []) as unknown as Row[]).filter((c) => c.messages.length > 0);
  const pending = rows.filter((c) => c.needs_attention).length;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Comunicación" subtitle={pending ? `${pending} conversación(es) necesitan tu respuesta` : "El asistente está respondiendo todo"} />
      {rows.length === 0 ? (
        <EmptyState>Cuando un huésped escriba en el asistente, la conversación aparece acá.</EmptyState>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {rows.map((c) => {
            const last = c.messages[0];
            return (
              <Link key={c.id} href={`/inbox/${c.id}`} className={clsx("flex items-start justify-between gap-4 px-5 py-4 hover:bg-surface-muted/50", c.needs_attention && "bg-warn-soft/30")}>
                <div className="min-w-0">
                  <p className="font-medium">
                    {c.reservations?.guests?.full_name || c.reservations?.confirmation_code || "Huésped"}
                    <span className="font-normal text-muted"> · {c.reservations?.properties?.name}</span>
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted">
                    {last.role === "guest" ? "" : last.role === "admin" ? "Vos: " : last.role === "system" ? "" : "Asistente: "}
                    {last.content}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs text-muted">{formatDateTime(c.last_message_at, org.timezone)}</span>
                  {c.needs_attention && <Badge tone="yellow">Necesita respuesta</Badge>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
