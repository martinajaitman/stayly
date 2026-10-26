import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente con service role: saltea RLS. Usar solo en el servidor para el portal
// del huésped, el cron y los webhooks, siempre filtrando por organización o token.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
