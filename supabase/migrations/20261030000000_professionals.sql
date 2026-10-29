-- Profesionales, cotizaciones de incidencias, pozo mensual y avisos dentro de la app.

-- ───────────────────────── Estados nuevos de incidencia ─────────────────────────
-- Pendiente → Cotizando → Esperando aprobación → Asignada → Visita agendada → En proceso → Resuelta
alter type incident_status add value if not exists 'quoting' after 'pending';
alter type incident_status add value if not exists 'awaiting_approval' after 'quoting';
alter type incident_status add value if not exists 'scheduled' after 'assigned';

-- ───────────────────────── Profesionales ─────────────────────────
alter table profiles
  add column if not exists specialties text[] not null default '{}',
  add column if not exists zone text not null default '';

create table professional_availability (
  profile_id uuid not null references profiles (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = domingo
  slot text not null check (slot in ('morning', 'afternoon')),
  primary key (profile_id, weekday, slot)
);

-- ───────────────────────── Configuración de la organización ─────────────────────────
alter table organizations
  add column if not exists monthly_incident_fund numeric(12, 2) not null default 0,
  add column if not exists default_incident_cap numeric(12, 2) not null default 0,
  add column if not exists quote_window_minutes int not null default 120 check (quote_window_minutes between 5 and 2880);

-- ───────────────────────── Incidencias ─────────────────────────
alter table incidents
  add column if not exists service text
    check (service in ('plumbing', 'electricity', 'gas', 'air', 'locksmith', 'appliances', 'internet', 'general')),
  add column if not exists budget_cap numeric(12, 2),
  add column if not exists quote_deadline timestamptz,
  add column if not exists resolution text check (resolution in ('repair', 'replace')),
  add column if not exists selected_quote_id uuid,
  add column if not exists approved_amount numeric(12, 2),
  add column if not exists approved_at timestamptz,
  add column if not exists visit_at timestamptz,
  add column if not exists resolution_notes text not null default '';
create index if not exists incidents_approved_at on incidents (organization_id, approved_at);

-- A quién se le pidió presupuesto
create table quote_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  incident_id uuid not null references incidents (id) on delete cascade,
  professional_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (incident_id, professional_id)
);
create index on quote_requests (professional_id);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  incident_id uuid not null references incidents (id) on delete cascade,
  professional_id uuid not null references profiles (id) on delete cascade,
  repair_amount numeric(12, 2) check (repair_amount > 0),
  replace_amount numeric(12, 2) check (replace_amount > 0),
  notes text not null default '',
  proposed_slots timestamptz[] not null default '{}',
  status text not null default 'submitted' check (status in ('submitted', 'selected', 'discarded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (incident_id, professional_id),
  constraint quote_has_amount check (repair_amount is not null or replace_amount is not null)
);
create index on quotes (incident_id);

alter table incidents
  add constraint incidents_selected_quote_fk foreign key (selected_quote_id) references quotes (id) on delete set null;

create trigger quotes_touch before update on quotes
  for each row execute function touch_updated_at();

-- ───────────────────────── Avisos dentro de la app ─────────────────────────
create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  body text not null default '',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on notifications (profile_id, read_at, created_at desc);

-- ───────────────────────── RLS ─────────────────────────
alter table professional_availability enable row level security;
alter table quote_requests enable row level security;
alter table quotes enable row level security;
alter table notifications enable row level security;

create policy "admins manage availability" on professional_availability for all
  using (organization_id = current_org_id() and current_role_is('admin'))
  with check (organization_id = current_org_id() and current_role_is('admin'));
create policy "pros manage own availability" on professional_availability for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and organization_id = current_org_id());

create policy "admins manage quote requests" on quote_requests for all
  using (organization_id = current_org_id() and current_role_is('admin'))
  with check (organization_id = current_org_id() and current_role_is('admin'));
create policy "pros read own quote requests" on quote_requests for select
  using (professional_id = auth.uid());

create policy "admins manage quotes" on quotes for all
  using (organization_id = current_org_id() and current_role_is('admin'))
  with check (organization_id = current_org_id() and current_role_is('admin'));
create policy "pros read own quotes" on quotes for select
  using (professional_id = auth.uid());
-- Las cotizaciones las guarda el servidor (valida el pedido y dispara la selección).

create policy "users read own notifications" on notifications for select
  using (profile_id = auth.uid());
create policy "users mark own notifications" on notifications for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- El personal solo ve las propiedades donde tiene trabajo asignado
-- (antes veía todas, con códigos de acceso incluidos).
drop policy if exists "staff read properties" on properties;
create policy "staff read assigned properties" on properties for select
  using (
    organization_id = current_org_id()
    and (
      exists (select 1 from tasks t where t.property_id = properties.id and t.assigned_to = auth.uid())
      or exists (
        select 1 from incidents i
        where i.property_id = properties.id and i.assigned_to = auth.uid()
          and i.status::text in ('assigned', 'scheduled', 'in_progress', 'resolved')
      )
    )
  );

grant select, insert, update, delete on professional_availability, quote_requests, quotes, notifications
  to authenticated, service_role;

alter publication supabase_realtime add table notifications;
