# Stayly — MVP

Plataforma de automatización para alquileres temporarios: reservas de Airbnb/Booking por iCal, calendario centralizado, ficha de propiedades, portal del huésped con asistente IA, limpieza e incidencias.

**Estado:** semana 1 de 4 (base, auth, propiedades, reservas, sincronización iCal, dashboard y calendario).

## Stack
Next.js 16 (App Router) · Supabase (Postgres, Auth, RLS, Storage, Realtime) · Tailwind 4 · Vitest.

## Puesta en marcha

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. Aplicar el esquema y los datos demo, con **una** de estas opciones:
   - CLI: `npx supabase link --project-ref <ref>` → `npx supabase db push` → correr `supabase/seed.sql` en el SQL Editor.
   - Manual: pegar `supabase/migrations/20261026000000_init.sql` y después `supabase/seed.sql` en el SQL Editor.
3. `cp .env.example .env.local` y completar las claves (Project Settings → API Keys).
4. `npm install && npm run dev` → http://localhost:3000

Usuarios demo (del seed): `admin@stayly.demo` / `stayly123` (admin) y `maria@stayly.demo` / `stayly123` (limpieza).
También podés registrarte desde `/login`: el alta crea una organización nueva con vos como admin.

## Sincronización iCal
- Cada propiedad acepta una o más URLs de exportación iCal (Airbnb, Booking.com).
- `GET /api/cron/tick` (con `Authorization: Bearer $CRON_SECRET`) sincroniza todas las propiedades. `vercel.json` lo programa cada 15 min.
  En el plan Hobby de Vercel los crons solo pueden correr una vez por día: para la demo usar el botón **Sincronizar ahora** de cada propiedad, o un cron externo (cron-job.org) que llame al endpoint.
- Lógica pura y testeada en `src/lib/ical/` (`parse.ts`, `plan.ts`): altas, cambios de fecha, cancelaciones (solo de canales cuyo feed se leyó bien) y se ignoran los bloqueos manuales de Airbnb.
- Limitación: iCal no trae nombre ni teléfono del huésped. El panel marca esas reservas con **Falta contacto** para completarlo.

## Estructura
```
src/app/(admin)/     dashboard, calendar, reservations, properties (panel del administrador)
src/app/(staff)/     today (vista mobile del personal, semana 3)
src/app/login        ingreso y registro
src/app/api/cron     sincronización periódica
src/lib/ical         parser + planificador de sincronización (+ tests)
src/lib/supabase     clientes server / service role / proxy de sesión
supabase/            migraciones y seed
```

## Scripts
`npm run dev` · `npm run build` · `npm test` · `npm run lint`
