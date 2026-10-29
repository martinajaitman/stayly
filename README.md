# StayAdmin — MVP

Plataforma de automatización para alquileres temporarios: reservas de Airbnb/Booking por iCal, calendario centralizado, ficha de propiedades, portal del huésped con asistente IA, limpieza e incidencias.

**Demo publicada:** https://stayadmin-app.vercel.app (admin@stayadmin.demo / stayadmin123)

**Estado:** semana 1 de 4 (base, auth, propiedades, reservas, sincronización iCal, dashboard y calendario).

## Stack
Next.js 16 (App Router) · Supabase (Postgres, Auth, RLS, Storage, Realtime) · Tailwind 4 · Vitest.

## Puesta en marcha

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. Aplicar el esquema y los datos demo, con **una** de estas opciones:
   - CLI: `npx supabase link --project-ref <ref>` → `npx supabase db push` → correr `supabase/seed.sql` en el SQL Editor.
   - Manual: en el SQL Editor correr, en orden, `supabase/migrations/20261026000000_init.sql`, `supabase/migrations/20261026000001_grants.sql` y `supabase/seed.sql`.
3. `cp .env.example .env.local` y completar las claves (Project Settings → API Keys).
4. `npm install && npm run dev` → http://localhost:3000

Usuarios demo (del seed): `admin@stayadmin.demo` / `stayadmin123` (admin) y `maria@stayadmin.demo` / `stayadmin123` (limpieza).
También podés registrarte desde `/login`: el alta crea una organización nueva con vos como admin.

## Sincronización iCal
- Cada propiedad acepta una o más URLs de exportación iCal (Airbnb, Booking.com).
- `GET /api/cron/tick` (con `Authorization: Bearer $CRON_SECRET`) sincroniza todas las propiedades. `vercel.json` lo programa una vez por día (límite del plan Hobby de Vercel).
  Para sincronizar más seguido: botón **Sincronizar ahora** de cada propiedad, o un cron externo (cron-job.org) que llame al endpoint cada 15 min.
- Lógica pura y testeada en `src/lib/ical/` (`parse.ts`, `plan.ts`): altas, cambios de fecha, cancelaciones (solo de canales cuyo feed se leyó bien) y se ignoran los bloqueos manuales de Airbnb.
- Limitación: iCal no trae nombre ni teléfono del huésped. El panel marca esas reservas con **Falta contacto** para completarlo.

## Deploy
Vercel (proyecto `stayadmin`). Variables de entorno de producción: las de `.env.example`, con `NEXT_PUBLIC_APP_URL=https://stayadmin-app.vercel.app`.
`npx vercel deploy --prod` publica desde la carpeta del proyecto.

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
