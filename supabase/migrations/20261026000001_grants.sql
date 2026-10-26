-- Los proyectos nuevos de Supabase no otorgan privilegios automáticos sobre las
-- tablas creadas por SQL. El acceso real lo siguen limitando las políticas RLS.
-- anon no recibe nada: el portal del huésped se sirve con service role.

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public grant usage, select on sequences to authenticated, service_role;
alter default privileges in schema public grant execute on functions to authenticated, service_role;
