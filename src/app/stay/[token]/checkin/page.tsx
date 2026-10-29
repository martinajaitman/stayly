import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getPortalReservation, isArrivalDay } from "@/lib/portal";
import { CheckinForm } from "./checkin-form";

export default async function CheckinPage({ params }: PageProps<"/stay/[token]/checkin">) {
  const { token } = await params;
  const r = await getPortalReservation(token);
  if (!r) notFound();
  if (r.status !== "confirmed") redirect(`/stay/${token}`);

  return (
    <>
      <Link href={`/stay/${token}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted"><ChevronLeft size={16} /> Volver</Link>
      <h1 className="text-xl font-semibold">Check-in digital</h1>
      <p className="mb-5 text-sm text-muted">{r.properties.name}</p>
      <CheckinForm
        token={token}
        guest={r.guests}
        houseRules={r.properties.house_rules}
        hasDocument={Boolean(r.guests?.document_image_path)}
        arrival={isArrivalDay(r)}
      />
    </>
  );
}
