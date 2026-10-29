import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot, ChevronLeft } from "lucide-react";
import { getMessages, getOrCreateConversation } from "@/lib/conversation";
import { getPortalReservation } from "@/lib/portal";
import { Chat } from "./chat";

export default async function ChatPage({ params }: PageProps<"/stay/[token]/chat">) {
  const { token } = await params;
  const r = await getPortalReservation(token);
  if (!r) notFound();
  const conversationId = await getOrCreateConversation(r.organization_id, r.id);
  const messages = await getMessages(conversationId);
  const shortName = r.properties.name.split(" - ")[0];

  return (
    <>
      <Link href={`/stay/${token}`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted"><ChevronLeft size={16} /> Mi estadía</Link>
      <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
        <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent"><Bot size={20} /></span>
        <div>
          <p className="font-semibold">Asistente {shortName}</p>
          <p className="text-xs text-muted">Responde en segundos</p>
        </div>
      </div>
      <Chat token={token} initial={messages} />
    </>
  );
}
