import clsx from "clsx";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { markAttended } from "../actions";
import { ReplyForm } from "./reply-form";

const WHO: Record<string, string> = { guest: "Huésped", assistant: "Asistente IA", admin: "Vos", system: "Sistema" };

export default async function ConversationPage({ params }: PageProps<"/inbox/[id]">) {
  const { id } = await params;
  const { supabase, org } = await requireAdmin();
  const { data } = await supabase
    .from("conversations")
    .select("id, needs_attention, reservation_id, reservations(id, properties(name), guests(full_name, phone)), messages(id, role, content, created_at)")
    .eq("id", id)
    .order("created_at", { referencedTable: "messages" })
    .maybeSingle();
  if (!data) notFound();
  const c = data as unknown as {
    id: string;
    needs_attention: boolean;
    reservations: { id: string; properties: { name: string } | null; guests: { full_name: string; phone: string | null } | null } | null;
    messages: { id: string; role: string; content: string; created_at: string }[];
  };

  return (
    <div className="max-w-3xl">
      <Link href="/inbox" className="mb-4 inline-flex items-center gap-1 text-sm text-muted"><ChevronLeft size={16} /> Comunicación</Link>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{c.reservations?.guests?.full_name || "Huésped"}</h1>
          <p className="text-sm text-muted">
            {c.reservations?.properties?.name} ·{" "}
            <Link href={`/reservations/${c.reservations?.id}`} className="text-accent">ver reserva</Link>
            {c.reservations?.guests?.phone && <> · {c.reservations.guests.phone}</>}
          </p>
        </div>
        {c.needs_attention && (
          <form action={markAttended.bind(null, c.id)}>
            <Button variant="secondary">Marcar como atendida</Button>
          </form>
        )}
      </div>

      <Card className="mb-5 flex flex-col gap-3">
        {c.messages.map((m) =>
          m.role === "system" ? (
            <p key={m.id} className="rounded-xl bg-warn-soft px-3 py-2 text-center text-xs text-warn">{m.content}</p>
          ) : (
            <div key={m.id} className={clsx("flex flex-col gap-0.5", m.role === "guest" ? "items-start" : "items-end")}>
              <span className="text-xs text-muted">{WHO[m.role]} · {formatDateTime(m.created_at, org.timezone)}</span>
              <div
                className={clsx(
                  "max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-line",
                  m.role === "guest" ? "bg-surface-muted" : m.role === "admin" ? "bg-accent text-white" : "bg-accent-soft text-accent",
                )}
              >
                {m.content}
              </div>
            </div>
          ),
        )}
      </Card>
      <ReplyForm conversationId={c.id} />
    </div>
  );
}
