-- Datos de demo: organización "Palermo Stays" con las 4 propiedades de los mockups.
-- Usuarios:  admin@stayly.demo / stayly123   ·   maria@stayly.demo / stayly123 (limpieza)
-- Las fechas son relativas a hoy, así la demo siempre tiene movimiento.

begin;

insert into organizations (id, name)
values ('11111111-1111-1111-1111-111111111111', 'Palermo Stays');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       crypt('stayly123', gen_salt('bf')), now(),
       jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'),
                          'organization_id', '11111111-1111-1111-1111-111111111111', 'role', u.role),
       jsonb_build_object('full_name', u.full_name),
       now(), now(), '', '', '', ''
from (values
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'admin@stayly.demo', 'Pía Usandizaga', 'admin'),
  ('aaaaaaaa-0000-0000-0000-000000000002'::uuid, 'maria@stayly.demo', 'María López', 'cleaner')
) as u(id, email, full_name, role);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
from auth.users where email like '%@stayly.demo';

-- Propiedades
insert into properties (
  id, organization_id, name, address, capacity, bedrooms, amenities, wifi_ssid, wifi_password,
  house_rules, access_instructions, access_code, keys_info, manager_contact, default_cleaner_id,
  recommendations, faq, status
) values
(
  'bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
  'Depto 4B - Palermo', 'Gorriti 4850, 4°B, Palermo Soho, CABA', 3, 1,
  '{Aire acondicionado,Smart TV,Lavarropas,Cafetera Nespresso,Balcón}', 'Depto4B_WiFi', 'palermo2024',
  'No se permite fumar dentro del departamento. No se aceptan mascotas. Silencio de 23 a 8 h. Máximo 3 huéspedes.',
  'El edificio tiene portero eléctrico. Tocá 4B y la puerta de calle se abre con el mismo código del departamento. Ascensor a la derecha.',
  '4B · 8291', 'Hay una llave de repuesto en el cajón de la mesa de entrada. Al salir, dejala ahí mismo.',
  '+54 9 11 5555-0101', 'aaaaaaaa-0000-0000-0000-000000000002',
  '[{"category":"Restaurante","name":"Don Julio","description":"Parrilla clásica a 6 cuadras. Conviene reservar."},
    {"category":"Supermercado","name":"Carrefour Express","description":"Gorriti y Thames, abre de 8 a 22 h."},
    {"category":"Transporte","name":"Subte D - Plaza Italia","description":"A 10 cuadras. Se paga con tarjeta SUBE o con tarjeta de crédito contactless."},
    {"category":"Paseo","name":"Plaza Serrano","description":"Bares, ferias de diseño los fines de semana."}]',
  '[{"question":"¿Puedo hacer late check-out?","answer":"Sujeto a disponibilidad, hasta las 13 h con un costo de USD 20. Consultá con el administrador."},
    {"question":"¿Dónde dejo la basura?","answer":"En el cuarto de residuos del palier, al lado del ascensor."},
    {"question":"¿Cómo funciona el aire acondicionado?","answer":"El control está en la mesa de luz. Botón ON y modo COOL o HEAT."}]',
  'occupied'
),
(
  'bbbbbbbb-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
  'Loft 2A - Recoleta', 'Av. Callao 1730, 2°A, Recoleta, CABA', 2, 1,
  '{Aire acondicionado,Smart TV,Escritorio}', 'Loft2A', 'recoleta2A!',
  'No se permite fumar. No se permiten fiestas.',
  'Retirá la llave en portería (atención 24 h) mostrando tu documento.',
  'Portería 24 h', 'Al salir, devolvé la llave en portería.',
  '+54 9 11 5555-0101', 'aaaaaaaa-0000-0000-0000-000000000002',
  '[{"category":"Café","name":"Café La Biela","description":"Clásico frente al Cementerio de Recoleta."}]',
  '[]', 'cleaning'
),
(
  'bbbbbbbb-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
  'Casa 3 - Belgrano', 'Juramento 2400, Belgrano, CABA', 6, 3,
  '{Parrilla,Patio,Lavarropas,Aire acondicionado}', 'Casa3', 'belgrano333',
  'No se permite fumar dentro de la casa. Se permite usar la parrilla hasta las 23 h.',
  'Cerradura con teclado en la puerta principal.', '3303', '', '+54 9 11 5555-0101', null,
  '[]', '[]', 'maintenance'
),
(
  'bbbbbbbb-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
  'Studio 5 - Palermo', 'Honduras 5200, 5°, Palermo, CABA', 2, 0,
  '{Aire acondicionado,Smart TV}', 'Studio5', 'studio5pal',
  'No se permite fumar.', 'Caja de seguridad junto a la puerta.', '5150', '', '+54 9 11 5555-0101',
  'aaaaaaaa-0000-0000-0000-000000000002', '[]', '[]', 'available'
);

-- Huéspedes
insert into guests (id, organization_id, full_name, phone, email, nationality) values
  ('cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Lucía Fernández', '+5491155550201', 'lucia@example.com', 'Argentina'),
  ('cccccccc-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'John Miller', '+15555550202', 'john@example.com', 'Estados Unidos'),
  ('cccccccc-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Camila Rocha', '+5511955550203', null, 'Brasil'),
  ('cccccccc-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Pedro Gómez', '+5491155550204', null, 'Argentina');

-- Reservas (horarios en hora de Buenos Aires)
with tz as (select 'America/Argentina/Buenos_Aires'::text as z),
     today as (select (now() at time zone (select z from tz))::date as d)
insert into reservations (
  organization_id, property_id, guest_id, channel, confirmation_code, check_in_at, check_out_at,
  guests_count, status, checked_in_at, portal_token
)
select '11111111-1111-1111-1111-111111111111', r.property_id, r.guest_id, r.channel::booking_channel, r.code,
       ((select d from today) + r.in_offset + time '15:00') at time zone (select z from tz),
       ((select d from today) + r.out_offset + time '10:00') at time zone (select z from tz),
       r.guests, r.status::reservation_status,
       case when r.status = 'checked_in' then ((select d from today) + r.in_offset + time '15:20') at time zone (select z from tz) end,
       r.token
from (values
  -- Depto 4B: ocupado, se va en 2 días
  ('bbbbbbbb-0000-0000-0000-000000000001'::uuid, 'cccccccc-0000-0000-0000-000000000001'::uuid, 'airbnb', 'HMXK29QZ3T', -2, 2, 2, 'checked_in', 'demo-depto4b'),
  -- Depto 4B: próxima reserva, sin contacto (importada por iCal)
  ('bbbbbbbb-0000-0000-0000-000000000001'::uuid, null, 'airbnb', 'HMPL83NN2A', 3, 7, 2, 'confirmed', 'demo-depto4b-next'),
  -- Loft 2A: hizo check-out hoy → en limpieza
  ('bbbbbbbb-0000-0000-0000-000000000002'::uuid, 'cccccccc-0000-0000-0000-000000000002'::uuid, 'booking', '4021558834', -4, 0, 1, 'checked_out', 'demo-loft2a'),
  -- Loft 2A: llega hoy a la tarde
  ('bbbbbbbb-0000-0000-0000-000000000002'::uuid, 'cccccccc-0000-0000-0000-000000000003'::uuid, 'booking', '4021600172', 0, 4, 2, 'confirmed', 'demo-loft2a-next'),
  -- Casa 3: ocupada con incidencia abierta
  ('bbbbbbbb-0000-0000-0000-000000000003'::uuid, 'cccccccc-0000-0000-0000-000000000004'::uuid, 'direct', null, -1, 5, 5, 'checked_in', 'demo-casa3'),
  -- Studio 5: llega mañana
  ('bbbbbbbb-0000-0000-0000-000000000004'::uuid, null, 'booking', '4021633390', 1, 3, 2, 'confirmed', 'demo-studio5')
) as r(property_id, guest_id, channel, code, in_offset, out_offset, guests, status, token);

update reservations set checked_out_at = check_out_at where status = 'checked_out';

-- Limpieza generada por el check-out del Loft 2A
insert into tasks (organization_id, type, property_id, reservation_id, assigned_to, scheduled_for, checklist)
select organization_id, 'cleaning', property_id, id, 'aaaaaaaa-0000-0000-0000-000000000002', check_out_at + interval '30 minutes',
       '[{"label":"Cambiar sábanas y toallas","done":false},{"label":"Limpiar baño","done":false},
         {"label":"Limpiar cocina y vajilla","done":false},{"label":"Reponer amenities","done":false},
         {"label":"Sacar la basura","done":false},{"label":"Revisar daños","done":false},
         {"label":"Ventilar y dejar luces apagadas","done":false}]'
from reservations where portal_token = 'demo-loft2a';

-- Incidencia abierta en Casa 3
insert into incidents (organization_id, property_id, reservation_id, category, priority, title, description, reported_by)
select organization_id, property_id, id, 'maintenance', 'high', 'No funciona el aire acondicionado',
       'El huésped informa que el aire del living no enfría.', 'guest'
from reservations where portal_token = 'demo-casa3';

-- Plantillas de mensajes por defecto (se usan en la semana 3)
insert into message_templates (organization_id, trigger, offset_minutes, body) values
  ('11111111-1111-1111-1111-111111111111', 'booking_confirmed', 0,
   'Hola, {{guest_name}}. ¡Tu estadía en {{property_name}} está confirmada! Te dejamos toda la información para preparar tu llegada: {{portal_link}}'),
  ('11111111-1111-1111-1111-111111111111', 'pre_48h', -2880,
   'Tu check-in es en 2 días, {{guest_name}}. Recordá completar el registro y revisar las instrucciones de acceso: {{portal_link}}'),
  ('11111111-1111-1111-1111-111111111111', 'checkin_day', -360,
   'Tu alojamiento ya está listo. Hacé el check-in digital para recibir el código de acceso: {{portal_link}}'),
  ('11111111-1111-1111-1111-111111111111', 'pre_checkout', -840,
   'Esperamos que hayas disfrutado tu estadía. Tu check-out es mañana a las {{checkout_time}}. Instrucciones: {{portal_link}}'),
  ('11111111-1111-1111-1111-111111111111', 'post_checkout', 120,
   '¡Gracias por hospedarte en {{property_name}}, {{guest_name}}! Nos ayudaría mucho que dejaras una reseña.');

commit;
