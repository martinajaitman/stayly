-- Stayly: esquema inicial
-- Multi-tenant por organization_id. El portal del huésped no usa RLS:
-- se sirve desde el servidor con service role, validando el portal_token.

create extension if not exists pgcrypto;

-- ───────────────────────── Enums ─────────────────────────
create type user_role as enum ('admin', 'cleaner', 'maintenance');
create type property_status as enum ('available', 'occupied', 'cleaning', 'maintenance', 'ready');
create type booking_channel as enum ('airbnb', 'booking', 'direct', 'other');
create type reservation_status as enum ('confirmed', 'checked_in', 'checked_out', 'cancelled');
create type message_trigger as enum ('booking_confirmed', 'pre_48h', 'checkin_day', 'pre_checkout', 'post_checkout');
create type message_channel as enum ('whatsapp', 'email', 'web');
create type scheduled_status as enum ('pending', 'sent', 'failed', 'cancelled');
create type message_role as enum ('guest', 'assistant', 'admin', 'system');
create type task_type as enum ('cleaning', 'maintenance');
create type task_status as enum ('pending', 'in_progress', 'done');
create type incident_status as enum ('pending', 'assigned', 'in_progress', 'resolved');
create type incident_priority as enum ('low', 'medium', 'high');
create type incident_category as enum ('maintenance', 'cleaning', 'access', 'amenities', 'noise', 'other');

-- ───────────────────────── Tablas ─────────────────────────
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'America/Argentina/Buenos_Aires',
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  full_name text not null default '',
  phone text,
  role user_role not null default 'admin',
  created_at timestamptz not null default now()
);
create index on profiles (organization_id);

create table properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  address text not null default '',
  capacity int not null default 2,
  bedrooms int not null default 1,
  amenities text[] not null default '{}',
  wifi_ssid text not null default '',
  wifi_password text not null default '',
  house_rules text not null default '',
  checkin_time time not null default '15:00',
  checkout_time time not null default '10:00',
  -- Información operativa
  access_instructions text not null default '',
  access_code text not null default '',
  keys_info text not null default '',
  manager_contact text not null default '',
  default_cleaner_id uuid references profiles (id) on delete set null,
  -- Información para huéspedes: [{category, name, description}]
  recommendations jsonb not null default '[]',
  -- [{question, answer}]
  faq jsonb not null default '[]',
  -- Sincronización
  ical_urls text[] not null default '{}',
  ical_last_synced_at timestamptz,
  ical_last_error text,
  status property_status not null default 'available',
  created_at timestamptz not null default now()
);
create index on properties (organization_id);

create table guests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  full_name text not null default '',
  phone text,
  email text,
  document_type text,
  document_number text,
  nationality text,
  document_image_path text,
  created_at timestamptz not null default now()
);
create index on guests (organization_id);

create table reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  property_id uuid not null references properties (id) on delete cascade,
  guest_id uuid references guests (id) on delete set null,
  channel booking_channel not null default 'direct',
  external_uid text,
  confirmation_code text,
  check_in_at timestamptz not null,
  check_out_at timestamptz not null,
  guests_count int not null default 1,
  status reservation_status not null default 'confirmed',
  notes text not null default '',
  portal_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  rules_accepted_at timestamptz,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservation_dates check (check_out_at > check_in_at),
  constraint reservation_external_uid unique (property_id, external_uid)
);
create index on reservations (organization_id, check_in_at);
create index on reservations (property_id, check_in_at);

create table message_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  -- null = plantilla por defecto de la organización
  property_id uuid references properties (id) on delete cascade,
  trigger message_trigger not null,
  -- Desfase en minutos respecto del evento de referencia (check-in o check-out)
  offset_minutes int not null default 0,
  body text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index message_templates_unique
  on message_templates (organization_id, coalesce(property_id, '00000000-0000-0000-0000-000000000000'::uuid), trigger);

create table scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  reservation_id uuid not null references reservations (id) on delete cascade,
  template_id uuid references message_templates (id) on delete set null,
  trigger message_trigger not null,
  channel message_channel not null default 'whatsapp',
  send_at timestamptz not null,
  status scheduled_status not null default 'pending',
  body text,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reservation_id, trigger)
);
create index on scheduled_messages (status, send_at);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  reservation_id uuid not null unique references reservations (id) on delete cascade,
  needs_attention boolean not null default false,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  conversation_id uuid not null references conversations (id) on delete cascade,
  role message_role not null,
  channel message_channel not null default 'web',
  content text not null,
  created_at timestamptz not null default now()
);
create index on messages (conversation_id, created_at);

create table incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  number int not null,
  property_id uuid not null references properties (id) on delete cascade,
  reservation_id uuid references reservations (id) on delete set null,
  category incident_category not null default 'other',
  priority incident_priority not null default 'medium',
  title text not null,
  description text not null default '',
  reported_by text not null default 'admin', -- 'guest' | 'admin' | 'staff' | 'ai'
  assigned_to uuid references profiles (id) on delete set null,
  status incident_status not null default 'pending',
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, number)
);
create index on incidents (organization_id, status);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  type task_type not null,
  property_id uuid not null references properties (id) on delete cascade,
  reservation_id uuid references reservations (id) on delete set null,
  incident_id uuid references incidents (id) on delete set null,
  assigned_to uuid references profiles (id) on delete set null,
  scheduled_for timestamptz,
  status task_status not null default 'pending',
  -- [{label, done}]
  checklist jsonb not null default '[]',
  photos text[] not null default '{}',
  notes text not null default '',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index on tasks (organization_id, status);
create index on tasks (assigned_to, scheduled_for);

-- ───────────────────────── Helpers ─────────────────────────
create or replace function current_org_id() returns uuid
language sql stable security definer set search_path = public as $$
  select organization_id from profiles where id = auth.uid()
$$;

create or replace function current_role_is(r user_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = r)
$$;

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger reservations_touch before update on reservations
  for each row execute function touch_updated_at();

-- Número correlativo de incidencia por organización (#124)
create or replace function set_incident_number() returns trigger
language plpgsql as $$
begin
  if new.number is null then
    perform pg_advisory_xact_lock(hashtext(new.organization_id::text));
    select coalesce(max(number), 100) + 1 into new.number
      from incidents where organization_id = new.organization_id;
  end if;
  return new;
end $$;

create trigger incidents_number before insert on incidents
  for each row execute function set_incident_number();

-- Alta de usuario: si viene organization_id en metadata se suma a esa org
-- (invitación de personal); si no, se crea una organización nueva y queda como admin.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  org uuid;
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if meta ? 'organization_id' then
    org := (meta ->> 'organization_id')::uuid;
  else
    insert into organizations (name)
      values (coalesce(nullif(meta ->> 'organization_name', ''), 'Mi organización'))
      returning id into org;
  end if;

  insert into profiles (id, organization_id, full_name, role)
  values (
    new.id,
    org,
    coalesce(meta ->> 'full_name', ''),
    coalesce((meta ->> 'role')::user_role, 'admin')
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ───────────────────────── RLS ─────────────────────────
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table properties enable row level security;
alter table guests enable row level security;
alter table reservations enable row level security;
alter table message_templates enable row level security;
alter table scheduled_messages enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table incidents enable row level security;
alter table tasks enable row level security;

create policy "org members read org" on organizations
  for select using (id = current_org_id());
create policy "admins update org" on organizations
  for update using (id = current_org_id() and current_role_is('admin'));

create policy "org members read profiles" on profiles
  for select using (organization_id = current_org_id());
create policy "admins manage profiles" on profiles
  for all using (organization_id = current_org_id() and current_role_is('admin'))
  with check (organization_id = current_org_id());

-- Admins: acceso total a los datos de su organización
do $$
declare t text;
begin
  foreach t in array array['properties','guests','reservations','message_templates',
                           'scheduled_messages','conversations','messages','incidents','tasks']
  loop
    execute format(
      'create policy "admins manage %1$s" on %1$I for all
         using (organization_id = current_org_id() and current_role_is(''admin''))
         with check (organization_id = current_org_id() and current_role_is(''admin''))', t);
  end loop;
end $$;

-- Personal: ve las propiedades de su org (para mostrar nombre/dirección/acceso)
create policy "staff read properties" on properties
  for select using (organization_id = current_org_id());

-- Personal: ve y actualiza solo sus tareas
create policy "staff read own tasks" on tasks
  for select using (organization_id = current_org_id() and assigned_to = auth.uid());
create policy "staff update own tasks" on tasks
  for update using (organization_id = current_org_id() and assigned_to = auth.uid())
  with check (organization_id = current_org_id() and assigned_to = auth.uid());

-- Mantenimiento: ve y actualiza las incidencias asignadas
create policy "staff read assigned incidents" on incidents
  for select using (organization_id = current_org_id() and assigned_to = auth.uid());
create policy "staff update assigned incidents" on incidents
  for update using (organization_id = current_org_id() and assigned_to = auth.uid())
  with check (organization_id = current_org_id() and assigned_to = auth.uid());

-- ───────────────────────── Storage ─────────────────────────
insert into storage.buckets (id, name, public)
values ('guest-documents', 'guest-documents', false),
       ('task-photos', 'task-photos', false)
on conflict (id) do nothing;

-- ───────────────────────── Realtime ─────────────────────────
alter publication supabase_realtime add table properties, reservations, tasks, incidents, messages;
