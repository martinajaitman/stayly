import type { Property, ReservationStatus } from "@/lib/types";

export interface AssistantStay {
  status: ReservationStatus;
  checkInLocal: string; // "jue 29 oct, 15:00"
  checkOutLocal: string;
  guestFirstName: string | null;
  organizationName: string;
  property: Pick<
    Property,
    | "name"
    | "address"
    | "capacity"
    | "amenities"
    | "wifi_ssid"
    | "wifi_password"
    | "house_rules"
    | "checkin_time"
    | "checkout_time"
    | "access_instructions"
    | "access_code"
    | "keys_info"
    | "manager_contact"
    | "recommendations"
    | "faq"
  >;
}

/**
 * System prompt del asistente del huésped. Solo incluye la información que el
 * huésped puede ver en este momento: Wi-Fi y acceso recién después del check-in,
 * igual que el portal. Lo que no está en el prompt, la IA no lo puede filtrar.
 */
export function buildAssistantSystemPrompt(s: AssistantStay): string {
  const p = s.property;
  const inside = s.status === "checked_in";
  const lines: string[] = [];
  const section = (title: string, body: string | string[] | null | undefined) => {
    const text = Array.isArray(body) ? body.filter(Boolean).join("\n") : body?.trim();
    if (text) lines.push(`## ${title}\n${text}`);
  };

  lines.push(
    `Sos el asistente virtual de "${p.name}", un alojamiento temporario administrado por ${s.organizationName}. ` +
      `Atendés al huésped${s.guestFirstName ? ` ${s.guestFirstName}` : ""} durante su estadía.`,
    `Respondé en el idioma en que te escriba el huésped, en tono cálido y breve (2 a 4 oraciones), sin markdown.`,
    `Usá solo la información de abajo. Si te preguntan algo que no figura, no lo inventes: decí que lo consultás con el equipo y usá escalate_to_admin.`,
    `Si el huésped reporta algo roto, que no funciona, un problema de limpieza, de acceso, ruidos o faltantes, usá create_incident (prioridad alta solo si le impide usar el alojamiento con normalidad: sin agua, sin luz, no puede entrar, pérdida de agua, aire que no funciona en temperaturas extremas) y avisale que el equipo ya fue notificado, con el número de incidencia.`,
    `Pedidos que requieren aprobación (late check-out, early check-in, huéspedes extra, mascotas, reembolsos) y reclamos: usá escalate_to_admin y aclarale que le confirman a la brevedad. No prometas nada.`,
    `Si el huésped plantea una emergencia (incendio, gas, inseguridad, salud), decile que llame al 911 primero y escalá.`,
  );

  section("Estadía", [
    `Check-in: ${s.checkInLocal}. Check-out: ${s.checkOutLocal}.`,
    `Estado: ${
      inside
        ? "el huésped ya hizo el check-in y está en el alojamiento."
        : s.status === "checked_out"
          ? "la estadía ya terminó."
          : "el huésped todavía no hizo el check-in digital."
    }`,
  ]);
  section("Alojamiento", [
    `Dirección: ${p.address || "no cargada"}. Capacidad: ${p.capacity} personas.`,
    `Horario habitual: check-in desde las ${p.checkin_time.slice(0, 5)}, check-out hasta las ${p.checkout_time.slice(0, 5)}.`,
    p.amenities.length ? `Amenities: ${p.amenities.join(", ")}.` : "",
  ]);
  section("Normas de la casa", p.house_rules);

  if (inside) {
    section("Wi-Fi", p.wifi_ssid ? `Red: ${p.wifi_ssid}. Contraseña: ${p.wifi_password}.` : "No cargado.");
    section("Acceso", [
      p.access_code && `Código de acceso: ${p.access_code}.`,
      p.access_instructions,
      p.keys_info && `Llaves: ${p.keys_info}`,
    ]);
  } else {
    section(
      "Wi-Fi y acceso",
      "Se habilitan en el portal después del check-in digital. Si los pide, explicale que primero tiene que completar el check-in desde el botón 'Hacer check-in digital' del portal. No los tenés disponibles.",
    );
  }

  section(
    "Recomendaciones del anfitrión",
    p.recommendations.map((r) => `- ${r.category ? `[${r.category}] ` : ""}${r.name}: ${r.description}`),
  );
  section(
    "Preguntas frecuentes",
    p.faq.map((f) => `P: ${f.question}\nR: ${f.answer}`),
  );
  section("Contacto del equipo", p.manager_contact);

  return lines.join("\n\n");
}

export const MAX_GUEST_MESSAGES_PER_DAY = 40;

export function overDailyLimit(guestMessagesLast24h: number): boolean {
  return guestMessagesLast24h >= MAX_GUEST_MESSAGES_PER_DAY;
}

/**
 * Historial guardado → mensajes para la API: solo texto, alternando roles.
 * Las respuestas del admin se presentan como turnos del asistente (hablan por el
 * alojamiento) y los mensajes consecutivos del mismo rol se unen.
 */
export function toApiHistory(
  rows: { role: "guest" | "assistant" | "admin" | "system"; content: string }[],
  limit = 30,
): { role: "user" | "assistant"; content: string }[] {
  const out: { role: "user" | "assistant"; content: string }[] = [];
  for (const row of rows) {
    if (row.role === "system" || !row.content.trim()) continue;
    const role = row.role === "guest" ? "user" : "assistant";
    const content = row.role === "admin" ? `[Respuesta del equipo] ${row.content}` : row.content;
    const last = out[out.length - 1];
    if (last && last.role === role) last.content += `\n\n${content}`;
    else out.push({ role, content });
  }
  const recent = out.slice(-limit);
  // La conversación tiene que empezar con el huésped.
  while (recent.length && recent[0].role !== "user") recent.shift();
  return recent;
}
