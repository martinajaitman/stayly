import { FundCard } from "@/components/fund-card";
import { PageHeader } from "@/components/ui";
import { getFundStatus } from "@/lib/automation/maintenance";
import { requireAdmin } from "@/lib/session";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const { supabase, org } = await requireAdmin();
  const [{ data }, fund] = await Promise.all([
    supabase.from("organizations").select("name, monthly_incident_fund, default_incident_cap, quote_window_minutes").eq("id", org.id).single(),
    getFundStatus(org.id),
  ]);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Configuración" />
      <div className="mb-5"><FundCard fund={fund} /></div>
      <SettingsForm
        name={data?.name ?? org.name}
        fund={Number(data?.monthly_incident_fund ?? 0)}
        cap={Number(data?.default_incident_cap ?? 0)}
        window={data?.quote_window_minutes ?? 120}
      />
    </div>
  );
}
