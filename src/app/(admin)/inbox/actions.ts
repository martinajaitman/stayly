"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";

export type ReplyState = { error?: string } | undefined;

export async function replyToGuest(conversationId: string, _: ReplyState, formData: FormData): Promise<ReplyState> {
  const { supabase, org } = await requireAdmin();
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "Escribí una respuesta" };
  const { data: conversation } = await supabase.from("conversations").select("id").eq("id", conversationId).single();
  if (!conversation) return { error: "Conversación no encontrada" };

  const { error } = await supabase.from("messages").insert({
    organization_id: org.id,
    conversation_id: conversationId,
    role: "admin",
    channel: "web",
    content,
  });
  if (error) return { error: error.message };
  await supabase
    .from("conversations")
    .update({ needs_attention: false, last_message_at: new Date().toISOString() })
    .eq("id", conversationId);
  revalidatePath(`/inbox/${conversationId}`);
  revalidatePath("/inbox");
}

export async function markAttended(conversationId: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("conversations").update({ needs_attention: false }).eq("id", conversationId);
  revalidatePath(`/inbox/${conversationId}`);
  revalidatePath("/inbox");
}
