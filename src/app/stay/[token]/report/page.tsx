import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getPortalReservation } from "@/lib/portal";
import { ReportForm } from "./report-form";

export default async function ReportPage({ params }: PageProps<"/stay/[token]/report">) {
  const { token } = await params;
  const r = await getPortalReservation(token);
  if (!r) notFound();
  return (
    <>
      <Link href={`/stay/${token}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted"><ChevronLeft size={16} /> Volver</Link>
      <h1 className="text-xl font-semibold">Reportar un problema</h1>
      <p className="mb-5 text-sm text-muted">Le llega al instante al equipo de {r.properties.name}.</p>
      <ReportForm token={token} />
    </>
  );
}
