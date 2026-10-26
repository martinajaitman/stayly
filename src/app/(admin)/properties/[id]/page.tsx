import { notFound } from "next/navigation";
import { PropertyStatusBadge } from "@/components/status";
import { ConfirmButton } from "@/components/confirm-button";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/session";
import type { Property } from "@/lib/types";
import { deleteProperty } from "../actions";
import { PropertyForm } from "../property-form";
import { SyncButton } from "../sync-button";

export default async function PropertyPage({ params }: PageProps<"/properties/[id]">) {
  const { id } = await params;
  const { supabase, org } = await requireAdmin();
  const { data } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const property = data as Property;

  const lastSync = property.ical_last_synced_at
    ? new Date(property.ical_last_synced_at).toLocaleString("es-AR", { timeZone: org.timezone, dateStyle: "short", timeStyle: "short" })
    : null;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={property.name}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <PropertyStatusBadge status={property.status} />
            {lastSync && <span>Última sincronización: {lastSync}</span>}
          </span>
        }
        actions={property.ical_urls.length > 0 && <SyncButton propertyId={property.id} />}
      />
      {property.ical_last_error && (
        <p className="mb-5 rounded-xl bg-danger-soft px-4 py-3 text-sm whitespace-pre-line text-danger">{property.ical_last_error}</p>
      )}
      <PropertyForm property={property} />
      <form action={deleteProperty.bind(null, property.id)} className="mt-10 border-t border-border pt-6">
        <ConfirmButton variant="danger" message="¿Eliminar la propiedad y todas sus reservas? No se puede deshacer.">
          Eliminar propiedad
        </ConfirmButton>
        <p className="mt-2 text-xs text-muted">Borra también sus reservas, tareas e incidencias.</p>
      </form>
    </div>
  );
}
