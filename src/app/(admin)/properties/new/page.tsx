import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/session";
import { PropertyForm } from "../property-form";
import { getCleaners } from "../staff";

export default async function NewPropertyPage() {
  const { supabase } = await requireAdmin();
  const staff = await getCleaners(supabase);
  return (
    <div className="max-w-4xl">
      <PageHeader title="Nueva propiedad" subtitle="Toda esta información alimenta los mensajes automáticos y el asistente IA." />
      <PropertyForm staff={staff} />
    </div>
  );
}
