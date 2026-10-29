import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { runAssistant, type AssistantEvent } from "@/lib/ai/assistant";
import { overDailyLimit } from "@/lib/ai/assistant-context";
import { getOrCreateConversation } from "@/lib/conversation";
import { getPortalReservation } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabase/admin";
import { daysAgoIso } from "@/lib/time";

const Body = z.object({ token: z.string(), message: z.string().trim().min(1).max(2000) });

// Chat del huésped: guarda el mensaje y responde en streaming (NDJSON, un evento por línea).
export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 });

  const r = await getPortalReservation(parsed.data.token);
  if (!r) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });

  const db = createAdminClient();
  const conversationId = await getOrCreateConversation(r.organization_id, r.id);
  const { count } = await db
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("role", "guest")
    .gte("created_at", daysAgoIso(1));
  if (overDailyLimit(count ?? 0)) {
    return NextResponse.json({ error: "Llegaste al límite de mensajes de hoy. Escribile al anfitrión por WhatsApp." }, { status: 429 });
  }

  await db.from("messages").insert({
    organization_id: r.organization_id,
    conversation_id: conversationId,
    role: "guest",
    channel: "web",
    content: parsed.data.message,
  });
  await db.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const emit = (e: AssistantEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY no configurada");
        await runAssistant(r, conversationId, emit);
      } catch (e) {
        console.error("assistant error", e);
        const text = "No pude responder en este momento. Ya le avisé al equipo y te contestan por acá.";
        emit({ type: "text", text });
        emit({ type: "escalated" });
        await db.from("messages").insert({ organization_id: r.organization_id, conversation_id: conversationId, role: "assistant", content: text });
        await db.from("conversations").update({ needs_attention: true }).eq("id", conversationId);
      }
      controller.close();
    },
  });

  return new Response(body, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
