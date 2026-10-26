import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/session";
import { ReservationForm } from "./reservation-form";

export default async function NewReservationPage({ searchParams }: PageProps<"/reservations/new">) {
  const { property } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("properties").select("id, name").order("name");
  return (
    <div className="max-w-3xl">
      <PageHeader title="Nueva reserva directa" subtitle="Las reservas de Airbnb y Booking entran solas por iCal." />
      <ReservationForm properties={data ?? []} defaultPropertyId={typeof property === "string" ? property : undefined} />
    </div>
  );
}
