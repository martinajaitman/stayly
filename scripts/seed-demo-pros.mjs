// Datos demo de profesionales, presupuestos y pozo (se corre una vez, después de
// la migración 20261030000000_professionals.sql):
//   node --env-file=.env.local scripts/seed-demo-pros.mjs
// Es idempotente: si los profesionales ya existen, no duplica nada.
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const ORG = "11111111-1111-1111-1111-111111111111";
const TZ = "America/Argentina/Buenos_Aires";
const PROPS = {
  depto4b: "bbbbbbbb-0000-0000-0000-000000000001",
  casa3: "bbbbbbbb-0000-0000-0000-000000000003",
  studio5: "bbbbbbbb-0000-0000-0000-000000000004",
};

const must = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

// Fecha local de Buenos Aires (UTC-3, sin horario de verano) + días + hora → ISO UTC
const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const at = (days, time) => {
  const [y, m, d] = today.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days, hh + 3, mm)).toISOString();
};

async function user(email, fullName, role, extra) {
  const existing = must(await db.from("profiles").select("id").eq("full_name", fullName).eq("organization_id", ORG));
  if (existing.length) return existing[0].id;
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: "stayadmin123",
    email_confirm: true,
    app_metadata: { organization_id: ORG, role },
    user_metadata: { full_name: fullName },
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  const created = must(await db.from("profiles").select("organization_id").eq("id", data.user.id).single());
  must(await db.from("profiles").update({ organization_id: ORG, role, full_name: fullName, ...extra }).eq("id", data.user.id));
  if (created.organization_id !== ORG) await db.from("organizations").delete().eq("id", created.organization_id);
  return data.user.id;
}

async function main() {
  const already = must(await db.from("properties").select("id").eq("organization_id", ORG).eq("name", "PH 7 - Villa Crespo"));
  if (already.length) {
    console.log("Los datos demo de profesionales ya están cargados. Nada para hacer.");
    return;
  }

  // Configuración del pozo
  must(await db.from("organizations").update({ monthly_incident_fund: 300000, default_incident_cap: 60000, quote_window_minutes: 120 }).eq("id", ORG));

  // Profesionales + disponibilidad
  const ricardo = await user("ricardo@stayadmin.demo", "Ricardo Gómez", "maintenance", { specialties: ["plumbing", "air"], zone: "Palermo, Villa Crespo", phone: "+54 9 11 5555-0301" });
  const luis = await user("luis@stayadmin.demo", "Luis Fernández", "maintenance", { specialties: ["plumbing", "electricity", "air"], zone: "Belgrano, Colegiales", phone: "+54 9 11 5555-0302" });
  const carla = await user("carla@stayadmin.demo", "Carla Ruiz", "maintenance", { specialties: ["electricity", "appliances"], zone: "Recoleta, Palermo", phone: "+54 9 11 5555-0303" });
  const avail = (id, cells) => cells.map(([weekday, slot]) => ({ profile_id: id, organization_id: ORG, weekday, slot }));
  must(await db.from("professional_availability").upsert([
    ...avail(ricardo, [[1, "morning"], [2, "morning"], [2, "afternoon"], [3, "afternoon"], [4, "morning"], [4, "afternoon"], [5, "afternoon"]]),
    ...avail(luis, [[1, "afternoon"], [2, "afternoon"], [3, "morning"], [3, "afternoon"], [4, "afternoon"], [5, "morning"], [6, "morning"]]),
    ...avail(carla, [[1, "morning"], [3, "morning"], [5, "morning"], [5, "afternoon"]]),
  ], { onConflict: "profile_id,weekday,slot", ignoreDuplicates: true }));

  // Dos propiedades más, con reservas
  const maria = must(await db.from("profiles").select("id").eq("organization_id", ORG).eq("role", "cleaner").limit(1))[0]?.id ?? null;
  const [ph7, duplex9] = must(
    await db
      .from("properties")
      .insert([
        {
          organization_id: ORG, name: "PH 7 - Villa Crespo", address: "Thames 820, Villa Crespo, CABA", capacity: 4, bedrooms: 2,
          amenities: ["Terraza", "Parrilla", "Aire acondicionado", "Lavarropas"], wifi_ssid: "PH7", wifi_password: "villacrespo7",
          house_rules: "No fumar adentro. Parrilla hasta las 23 h.", access_code: "7070", access_instructions: "Puerta de chapa verde, cerradura con teclado.",
          manager_contact: "+54 9 11 5555-0101", default_cleaner_id: maria, status: "occupied",
          recommendations: [{ category: "Café", name: "Café Crespín", description: "A 2 cuadras, brunch los fines de semana." }],
        },
        {
          organization_id: ORG, name: "Dúplex 9 - Colegiales", address: "Federico Lacroze 2900, Colegiales, CABA", capacity: 5, bedrooms: 2,
          amenities: ["Smart TV", "Escritorio", "Aire acondicionado"], wifi_ssid: "Duplex9", wifi_password: "colegiales99",
          house_rules: "No se permiten fiestas.", access_code: "9921", access_instructions: "Portería hasta las 20 h, después teclado.",
          manager_contact: "+54 9 11 5555-0101", default_cleaner_id: maria, status: "ready",
          recommendations: [{ category: "Supermercado", name: "Coto Colegiales", description: "A 4 cuadras, abre hasta las 22 h." }],
        },
      ])
      .select("id"),
  );
  const [g1, g2] = must(
    await db
      .from("guests")
      .insert([
        { organization_id: ORG, full_name: "Sofía Martínez", phone: "+5491155550210", nationality: "Argentina" },
        { organization_id: ORG, full_name: "Thomas Becker", phone: "+4915155550211", nationality: "Alemania" },
      ])
      .select("id"),
  );
  must(await db.from("reservations").insert([
    { organization_id: ORG, property_id: ph7.id, guest_id: g1.id, channel: "airbnb", confirmation_code: "HMVC77PH2A", check_in_at: at(-3, "15:00"), check_out_at: at(3, "10:00"), guests_count: 3, status: "checked_in", checked_in_at: at(-3, "15:40"), rules_accepted_at: at(-4, "18:00"), portal_token: "demo-ph7" },
    { organization_id: ORG, property_id: duplex9.id, guest_id: g2.id, channel: "booking", confirmation_code: "4021710044", check_in_at: at(0, "15:00"), check_out_at: at(5, "10:00"), guests_count: 2, status: "confirmed", portal_token: "demo-duplex9" },
    { organization_id: ORG, property_id: duplex9.id, channel: "airbnb", confirmation_code: "HMCL22DX9B", check_in_at: at(7, "15:00"), check_out_at: at(10, "10:00"), guests_count: 4, status: "confirmed", portal_token: "demo-duplex9-next" },
  ]));

  const reservation = async (token) => must(await db.from("reservations").select("id").eq("portal_token", token).single()).id;
  const lucia = await reservation("demo-depto4b");

  // 1) Casa 3 · aire: dos presupuestos esperando aprobación
  const casa3 = must(await db.from("incidents").select("id").eq("property_id", PROPS.casa3).eq("organization_id", ORG).limit(1).single());
  must(await db.from("incidents").update({ service: "air", status: "awaiting_approval", budget_cap: 60000, quote_deadline: at(0, "08:00") }).eq("id", casa3.id));
  must(await db.from("quote_requests").insert([ricardo, luis].map((p) => ({ organization_id: ORG, incident_id: casa3.id, professional_id: p }))));
  must(await db.from("quotes").insert([
    { organization_id: ORG, incident_id: casa3.id, professional_id: ricardo, repair_amount: 45000, replace_amount: 380000, notes: "Carga de gas y limpieza de filtros. Si es el compresor, conviene reemplazar.", proposed_slots: [at(1, "17:00"), at(2, "10:00")] },
    { organization_id: ORG, incident_id: casa3.id, professional_id: luis, repair_amount: 38000, replace_amount: 350000, notes: "Revisión completa, carga de gas incluida. Garantía 30 días.", proposed_slots: [at(1, "17:00"), at(2, "17:00"), at(3, "10:00")] },
  ]));

  // 2) Depto 4B · canilla: aprobada, visita agendada con Luis
  const canilla = must(await db.from("incidents").insert({
    organization_id: ORG, property_id: PROPS.depto4b, reservation_id: lucia, category: "maintenance", priority: "medium", service: "plumbing",
    title: "Pierde agua la canilla de la cocina", description: "Gotea todo el tiempo aunque esté cerrada.", reported_by: "ai",
    status: "scheduled", budget_cap: 60000, assigned_to: luis, resolution: "repair", approved_amount: 25000, approved_at: at(0, "09:00"), visit_at: at(1, "17:00"),
  }).select("id").single());
  must(await db.from("quote_requests").insert([ricardo, luis].map((p) => ({ organization_id: ORG, incident_id: canilla.id, professional_id: p }))));
  const [canillaLuis] = must(await db.from("quotes").insert([
    { organization_id: ORG, incident_id: canilla.id, professional_id: luis, repair_amount: 25000, replace_amount: 70000, notes: "Cambio de cuerito y ajuste.", proposed_slots: [at(1, "17:00"), at(2, "17:00")], status: "selected" },
    { organization_id: ORG, incident_id: canilla.id, professional_id: ricardo, repair_amount: 32000, replace_amount: null, notes: "", proposed_slots: [at(1, "10:00")], status: "discarded" },
  ]).select("id"));
  must(await db.from("incidents").update({ selected_quote_id: canillaLuis.id }).eq("id", canilla.id));

  // 3) PH 7 · ducha: aprobada, la huésped tiene que elegir horario
  const ph7Res = await reservation("demo-ph7");
  const ducha = must(await db.from("incidents").insert({
    organization_id: ORG, property_id: ph7.id, reservation_id: ph7Res, category: "maintenance", priority: "medium", service: "plumbing",
    title: "La ducha sale con muy poca presión", description: "Desde ayer casi no sale agua caliente en la ducha.", reported_by: "guest",
    status: "assigned", budget_cap: 60000, assigned_to: ricardo, resolution: "repair", approved_amount: 30000, approved_at: at(0, "10:30"),
  }).select("id").single());
  must(await db.from("quote_requests").insert([{ organization_id: ORG, incident_id: ducha.id, professional_id: ricardo }]));
  const [duchaQ] = must(await db.from("quotes").insert([
    { organization_id: ORG, incident_id: ducha.id, professional_id: ricardo, repair_amount: 30000, replace_amount: 85000, notes: "Probablemente sarro en el flexible.", proposed_slots: [at(1, "10:00"), at(1, "17:00"), at(2, "10:00")], status: "selected" },
  ]).select("id"));
  must(await db.from("incidents").update({ selected_quote_id: duchaQ.id }).eq("id", ducha.id));

  // 4) Studio 5 · enchufe: pidiendo presupuestos (Carla ya cotizó, Luis no)
  const enchufe = must(await db.from("incidents").insert({
    organization_id: ORG, property_id: PROPS.studio5, category: "maintenance", priority: "medium", service: "electricity",
    title: "No anda el enchufe del dormitorio", description: "Lo detectó la limpieza. Hay que revisarlo antes de la próxima llegada.", reported_by: "staff",
    status: "quoting", budget_cap: 60000, quote_deadline: at(0, "23:00"),
  }).select("id").single());
  must(await db.from("quote_requests").insert([luis, carla].map((p) => ({ organization_id: ORG, incident_id: enchufe.id, professional_id: p }))));
  must(await db.from("quotes").insert({ organization_id: ORG, incident_id: enchufe.id, professional_id: carla, repair_amount: 18000, replace_amount: 26000, notes: "Cambio de toma con materiales.", proposed_slots: [at(1, "10:00"), at(3, "10:00")] }));

  // Avisos
  const admins = must(await db.from("profiles").select("id").eq("organization_id", ORG).eq("role", "admin")).map((a) => a.id);
  const note = (ids, title, body, link) => ids.map((profile_id) => ({ organization_id: ORG, profile_id, title, body, link }));
  must(await db.from("notifications").insert([
    ...note(admins, "Incidencia #101: hay presupuesto para aprobar", "Recomendado: Arreglar con Luis Fernández · $ 38.000.", `/tasks/incidents/${casa3.id}`),
    ...note(admins, "Visita agendada: mañana 17:00", "Pierde agua la canilla de la cocina · Depto 4B. La huésped eligió el horario.", `/tasks/incidents/${canilla.id}`),
    ...note([luis], "Nuevo pedido de presupuesto: Electricidad", "No anda el enchufe del dormitorio", `/today/quotes/${enchufe.id}`),
    ...note([luis], "Visita confirmada: mañana 17:00", "Pierde agua la canilla de la cocina", `/today/visits/${canilla.id}`),
    ...note([ricardo], "¡Te eligieron! La ducha sale con muy poca presión", "Arreglar · $ 30.000. Te avisamos cuando la huésped elija el horario.", `/today/visits/${ducha.id}`),
  ]));

  // Estado de las propiedades
  must(await db.from("properties").update({ status: "maintenance" }).eq("id", PROPS.casa3));
  console.log("Listo: 3 profesionales, 2 propiedades, 4 incidencias con presupuestos y pozo de $300.000.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
