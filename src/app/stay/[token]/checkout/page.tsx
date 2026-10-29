import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getPortalReservation } from "@/lib/portal";
import { CheckoutForm } from "./checkout-form";

export default async function CheckoutPage({ params }: PageProps<"/stay/[token]/checkout">) {
  const { token } = await params;
  const r = await getPortalReservation(token);
  if (!r) notFound();
  if (r.status !== "checked_in") redirect(`/stay/${token}`);
  const p = r.properties;
  return (
    <>
      <Link href={`/stay/${token}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted"><ChevronLeft size={16} /> Volver</Link>
      <h1 className="text-xl font-semibold">Check-out</h1>
      <p className="mb-5 text-sm text-muted">Antes de irte:</p>
      <ul className="mb-5 flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-sm">
        <li>• Apagá luces y aire acondicionado.</li>
        <li>• Cerrá ventanas y la puerta con llave.</li>
        {p.keys_info && <li>• {p.keys_info}</li>}
      </ul>
      <CheckoutForm token={token} />
    </>
  );
}
