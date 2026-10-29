import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processDueCheckouts } from "@/lib/automation/events";
import { syncProperty } from "@/lib/ical/sync";

// Vercel Cron (ver vercel.json): sincroniza iCal y cierra estadías vencidas.
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: properties, error } = await supabase
    .from("properties")
    .select("id, organization_id, ical_urls, checkin_time, checkout_time, organizations(timezone)")
    .neq("ical_urls", "{}");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const p of properties ?? []) {
    const org = p.organizations as unknown as { timezone: string } | null;
    try {
      results.push(await syncProperty(supabase, p, org?.timezone ?? "America/Argentina/Buenos_Aires"));
    } catch (e) {
      results.push({ propertyId: p.id, errors: [e instanceof Error ? e.message : String(e)] });
    }
  }

  const checkouts = await processDueCheckouts();
  return NextResponse.json({ synced: results.length, checkouts, results });
}
