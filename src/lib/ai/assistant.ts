import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createIncident } from "@/lib/automation/events";
import type { PortalData } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAssistantSystemPrompt, toApiHistory } from "./assistant-context";

const MODEL = "claude-haiku-5-5";
const MAX_TOOL_ROUNDS = 4;

const tools: Anthropic.Tool[] = [
  {
    name: "create_incident",
    description:
      "Registra un problema del alojamiento reportado por el huésped (algo roto o que no funciona, limpieza, acceso, faltantes, ruidos) y notifica al equipo. Devuelve el número de incidencia para informárselo al huésped.",
    strict: true,
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string", enum: ["maintenance", "cleaning", "access", "amenities", "noise", "other"] },
        priority: { type: "string", enum: ["medium", "high"], description: "high solo si impide usar el alojamiento con normalidad" },
        service: {
          type: "string",
          enum: ["plumbing", "electricity", "gas", "air", "locksmith", "appliances", "internet", "general", "none"],
          description: "Rubro del profesional que lo arregla (none si no hace falta un técnico, ej. limpieza o ruidos)",
        },
        title: { type: "string", description: "Resumen corto en español, ej: 'No funciona el aire acondicionado'" },
        description: { type: "string", description: "Lo que contó el huésped, con los detalles útiles para el técnico" },
      },
      required: ["category", "priority", "service", "title", "description"],
      additionalProperties: false,
    },
  },
  {
    name: "escalate_to_admin",
    description:
      "Deriva la conversación al equipo humano: pedidos que requieren aprobación (late check-out, early check-in, huéspedes extra), reclamos, emergencias o preguntas que no se pueden responder con la información disponible.",
    strict: true,
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Qué necesita el huésped, en una oración" },
      },
      required: ["reason"],
      additionalProperties: false,
    },
  },
];

const IncidentInput = z.object({
  category: z.enum(["maintenance", "cleaning", "access", "amenities", "noise", "other"]),
  priority: z.enum(["medium", "high"]),
  service: z.enum(["plumbing", "electricity", "gas", "air", "locksmith", "appliances", "internet", "general", "none"]),
  title: z.string().min(3).max(120),
  description: z.string().max(2000),
});
const EscalateInput = z.object({ reason: z.string().min(3).max(500) });

export type AssistantEvent =
  | { type: "text"; text: string }
  | { type: "incident"; number: number }
  | { type: "escalated" };

function localStamp(iso: string, tz: string) {
  return new Intl.DateTimeFormat("es-AR", { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/**
 * Responde el último mensaje del huésped. Corre el bucle de herramientas,
 * emite el texto a medida que llega y guarda la respuesta en la conversación.
 */
export async function runAssistant(
  r: PortalData,
  conversationId: string,
  emit: (e: AssistantEvent) => void,
): Promise<void> {
  const db = createAdminClient();
  const { data: rows } = await db
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(40);
  const messages: Anthropic.MessageParam[] = toApiHistory((rows ?? []).reverse());

  const system = buildAssistantSystemPrompt({
    status: r.status,
    checkInLocal: localStamp(r.check_in_at, r.organizations.timezone),
    checkOutLocal: localStamp(r.check_out_at, r.organizations.timezone),
    guestFirstName: r.guests?.full_name?.split(" ")[0] || null,
    organizationName: r.organizations.name,
    property: r.properties,
  });

  const client = new Anthropic();
  let reply = "";
  let escalated = false;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" },
      system,
      tools,
      messages,
    });
    stream.on("text", (delta) => {
      reply += delta;
      emit({ type: "text", text: delta });
    });

    let message: Anthropic.Message;
    try {
      message = await stream.finalMessage();
    } catch (err) {
      if (err instanceof Anthropic.APIError) throw err;
      continue; // input de herramienta ilegible: se reintenta el turno
    }

    if (message.stop_reason === "refusal") {
      const text = "Prefiero que esto lo vea una persona del equipo. Ya les avisé y te responden por acá.";
      reply += text;
      emit({ type: "text", text });
      escalated = true;
      break;
    }

    const toolUses = message.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (toolUses.length === 0 || message.stop_reason === "max_tokens") break;

    messages.push({ role: "assistant", content: message.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tool of toolUses) {
      if (tool.name === "create_incident") {
        const input = IncidentInput.safeParse(tool.input);
        if (!input.success) {
          results.push({ type: "tool_result", tool_use_id: tool.id, is_error: true, content: "Datos inválidos, revisá los campos." });
          continue;
        }
        const { number } = await createIncident({
          organizationId: r.organization_id,
          propertyId: r.property_id,
          reservationId: r.id,
          category: input.data.category,
          priority: input.data.priority,
          title: input.data.title,
          description: input.data.description,
          reportedBy: "ai",
          service: input.data.service === "none" ? null : input.data.service,
        });
        emit({ type: "incident", number });
        results.push({ type: "tool_result", tool_use_id: tool.id, content: `Incidencia #${number} creada y equipo notificado.${input.data.service !== "none" ? " Ya se pidieron presupuestos a los técnicos; cuando el administrador apruebe uno, el huésped va a poder elegir el horario de la visita en su página." : ""}` });
      } else if (tool.name === "escalate_to_admin") {
        const input = EscalateInput.safeParse(tool.input);
        escalated = true;
        if (input.success) {
          await db.from("messages").insert({
            organization_id: r.organization_id,
            conversation_id: conversationId,
            role: "system",
            content: `Derivado al equipo: ${input.data.reason}`,
          });
        }
        results.push({ type: "tool_result", tool_use_id: tool.id, content: "Derivado. El equipo responde en esta misma conversación." });
      } else {
        results.push({ type: "tool_result", tool_use_id: tool.id, is_error: true, content: "Herramienta desconocida" });
      }
    }
    messages.push({ role: "user", content: results });
    if (reply && !reply.endsWith(" ") && !reply.endsWith("\n")) {
      reply += "\n";
      emit({ type: "text", text: "\n" });
    }
  }

  if (escalated) emit({ type: "escalated" });
  if (!reply.trim()) {
    reply = "Disculpá, no pude responder ahora. Ya le aviso al equipo.";
    emit({ type: "text", text: reply });
    escalated = true;
  }

  await db.from("messages").insert({
    organization_id: r.organization_id,
    conversation_id: conversationId,
    role: "assistant",
    channel: "web",
    content: reply.trim(),
  });
  await db
    .from("conversations")
    .update({ last_message_at: new Date().toISOString(), ...(escalated ? { needs_attention: true } : {}) })
    .eq("id", conversationId);
}
