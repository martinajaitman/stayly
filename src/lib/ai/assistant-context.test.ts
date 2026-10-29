import { describe, expect, it } from "vitest";
import { buildAssistantSystemPrompt, overDailyLimit, toApiHistory, type AssistantStay } from "./assistant-context";

const stay = (status: AssistantStay["status"]): AssistantStay => ({
  status,
  checkInLocal: "jue 29 oct, 15:00",
  checkOutLocal: "sáb 31 oct, 10:00",
  guestFirstName: "Lucía",
  organizationName: "Palermo Stays",
  property: {
    name: "Depto 4B",
    address: "Gorriti 4850",
    capacity: 3,
    amenities: ["Aire acondicionado"],
    wifi_ssid: "Depto4B_WiFi",
    wifi_password: "palermo2024",
    house_rules: "No fumar.",
    checkin_time: "15:00:00",
    checkout_time: "10:00:00",
    access_instructions: "Portero eléctrico 4B.",
    access_code: "4B · 8291",
    keys_info: "Llave de repuesto en el cajón.",
    manager_contact: "+54 9 11 5555-0101",
    recommendations: [{ category: "Restaurante", name: "Don Julio", description: "Parrilla" }],
    faq: [{ question: "¿Late check-out?", answer: "Hasta las 13 con costo." }],
  },
});

describe("buildAssistantSystemPrompt", () => {
  it("antes del check-in no incluye Wi-Fi ni código de acceso", () => {
    const prompt = buildAssistantSystemPrompt(stay("confirmed"));
    expect(prompt).not.toContain("palermo2024");
    expect(prompt).not.toContain("8291");
    expect(prompt).toContain("check-in digital");
  });
  it("después del check-in los incluye", () => {
    const prompt = buildAssistantSystemPrompt(stay("checked_in"));
    expect(prompt).toContain("palermo2024");
    expect(prompt).toContain("4B · 8291");
  });
  it("incluye recomendaciones, preguntas frecuentes y normas", () => {
    const prompt = buildAssistantSystemPrompt(stay("confirmed"));
    expect(prompt).toContain("Don Julio");
    expect(prompt).toContain("Hasta las 13 con costo.");
    expect(prompt).toContain("No fumar.");
  });
});

describe("toApiHistory", () => {
  it("convierte roles, une consecutivos y arranca por el huésped", () => {
    expect(
      toApiHistory([
        { role: "assistant", content: "Bienvenida" },
        { role: "guest", content: "Hola" },
        { role: "guest", content: "¿wifi?" },
        { role: "assistant", content: "Es X" },
        { role: "admin", content: "Te confirmo el late check-out" },
        { role: "system", content: "interno" },
      ]),
    ).toEqual([
      { role: "user", content: "Hola\n\n¿wifi?" },
      { role: "assistant", content: "Es X\n\n[Respuesta del equipo] Te confirmo el late check-out" },
    ]);
  });
});

describe("overDailyLimit", () => {
  it("corta en 40 mensajes por día", () => {
    expect(overDailyLimit(39)).toBe(false);
    expect(overDailyLimit(40)).toBe(true);
  });
});
