-- Seguridad del alta de usuarios.
-- Antes: handle_new_user leía organization_id y role de raw_user_meta_data, que
-- cualquiera puede mandar en el registro público (supabase.auth.signUp). Alguien
-- podía sumarse como admin a una organización ajena conociendo su id.
-- Ahora: esos dos datos solo se leen de raw_app_meta_data, que únicamente se
-- escribe con service role (auth.admin.createUser desde el panel de Equipo).

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  org uuid;
  app jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  user_role user_role := 'admin';
begin
  if app ? 'organization_id' then
    org := (app ->> 'organization_id')::uuid;
    user_role := coalesce((app ->> 'role')::user_role, 'cleaner');
  else
    -- Registro público: siempre una organización nueva, con el usuario como admin.
    insert into organizations (name)
      values (coalesce(nullif(meta ->> 'organization_name', ''), 'Mi organización'))
      returning id into org;
  end if;

  insert into profiles (id, organization_id, full_name, role)
  values (new.id, org, coalesce(meta ->> 'full_name', ''), user_role);
  return new;
end $$;
