import { notFound } from "next/navigation";
import { getPortalReservation } from "@/lib/portal";

export default async function StayLayout({ children, params }: LayoutProps<"/stay/[token]">) {
  const { token } = await params;
  const r = await getPortalReservation(token);
  if (!r) notFound();
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md px-4 pt-6 pb-12">{children}</main>
      <p className="pb-6 text-center text-xs text-muted">{r.organizations.name} · con StayAdmin</p>
    </div>
  );
}
