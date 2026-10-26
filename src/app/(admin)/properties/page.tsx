import Link from "next/link";
import { Plus } from "lucide-react";
import { PropertyStatusBadge } from "@/components/status";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/session";
import type { Property } from "@/lib/types";

export default async function PropertiesPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("properties").select("*").order("name");
  const properties = (data ?? []) as Property[];

  return (
    <>
      <PageHeader
        title="Propiedades"
        subtitle={`${properties.length} alojamientos`}
        actions={
          <Link href="/properties/new" className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white">
            <Plus size={16} /> Nueva propiedad
          </Link>
        }
      />
      {properties.length === 0 ? (
        <EmptyState>Todavía no cargaste propiedades. Empezá por la primera.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((p) => (
            <Link key={p.id} href={`/properties/${p.id}`}>
              <Card className="h-full transition hover:border-accent">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold">{p.name}</h2>
                  <PropertyStatusBadge status={p.status} />
                </div>
                <p className="mt-1 text-sm text-muted">{p.address || "Sin dirección"}</p>
                <p className="mt-4 text-xs text-muted">
                  {p.capacity} personas · {p.bedrooms} hab. ·{" "}
                  {p.ical_urls.length ? `${p.ical_urls.length} canal(es) conectado(s)` : "Sin canales conectados"}
                </p>
                {p.ical_last_error && <p className="mt-2 text-xs text-danger">Error de sincronización</p>}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
