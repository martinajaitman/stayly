import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Conversación de la reserva (una por reserva); la crea si no existe. */
export async function getOrCreateConversation(organizationId: string, reservationId: string): Promise<string> {
  const db = createAdminClient();
  const { data: existing } = await db.from("conversations").select("id").eq("reservation_id", reservationId).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await db
    .from("conversations")
    .upsert({ organization_id: organizationId, reservation_id: reservationId }, { onConflict: "reservation_id" })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear la conversación");
  return data.id;
}

export interface ChatMessage {
  id: string;
  role: "guest" | "assistant" | "admin" | "system";
  content: string;
  created_at: string;
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data } = await createAdminClient()
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at");
  return (data ?? []) as ChatMessage[];
}
