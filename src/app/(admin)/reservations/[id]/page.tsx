import Link from "next/link";
import { notFound } from "next/navigation";
import { ChannelBadge, ReservationStatusBadge } from "@/components/status";
import { ConfirmButton } from "@/components/confirm-button";
import { Button, Card, PageHeader } from "@/components/ui";
import { formatDateTime, nights, portalUrl } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { toZonedDay, toZonedTime } from "@/lib/time";
import type { Guest, Reservation } from "@/lib/types";
import { setReservationStatus } from "../actions";
import { CopyLink, GuestForm, TimesForm } from "./forms";

type Row = Reservation & { properties: { id: string; name: string } | null; guests: Guest | null };

export default async function ReservationPage({ params }: PageProps<"/reservations/[id]">) {
  const { id } = await params;
  const { supabase, org } = await requireAdmin();
  const { data } = await supabase.from("reservations").select("*, properties(id, name), guests(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const r = data as Row;
  const tz = org.timezone;
  const split = (iso: string) => ({ day: toZonedDay(new Date(iso), tz), time: toZonedTime(new Date(iso), tz) });

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={r.guests?.full_name || r.confirmation_code || "Reserva"}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <ReservationStatusBadge status={r.status} />
            <ChannelBadge channel={r.channel} />
            {r.confirmation_code && <span>Código {r.confirmation_code}</span>}
          </span>
        }
      />

      <div className="flex flex-col gap-5">
        <Card className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted">Propiedad</p>
            <Link href={`/properties/${r.properties?.id}`} className="font-medium hover:text-accent">{r.properties?.name}</Link>
          </div>
          <div>
            <p className="text-xs text-muted">Check-in</p>
            <p className="font-medium">{formatDateTime(r.check_in_at, tz)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Check-out · {nights(r.check_in_at, r.check_out_at)} noches</p>
            <p className="font-medium">{formatDateTime(r.check_out_at, tz)}</p>
          </div>
          {r.notes && <p className="text-sm text-muted sm:col-span-3">{r.notes}</p>}
        </Card>

        <Card>
          <h2 className="mb-1 font-semibold">Huésped</h2>
          {!r.guests?.phone && (
            <p className="mb-4 text-sm text-warn">
              {r.channel === "direct"
                ? "Cargá el WhatsApp para enviarle los mensajes automáticos."
                : "Los calendarios de Airbnb/Booking no comparten el contacto del huésped. Copialo desde el mensaje de la plataforma para activar los mensajes automáticos."}
            </p>
          )}
          <GuestForm reservationId={r.id} guest={r.guests} />
        </Card>

        <Card>
          <h2 className="mb-1 font-semibold">Portal del huésped</h2>
          <p className="mb-3 text-sm text-muted">Link único con la info de la estadía, check-in digital y asistente.</p>
          <CopyLink url={portalUrl(r.portal_token)} />
        </Card>

        <Card>
          <h2 className="mb-1 font-semibold">Horarios</h2>
          <p className="mb-4 text-sm text-muted">Para early check-in o late check-out.</p>
          <TimesForm reservationId={r.id} checkIn={split(r.check_in_at)} checkOut={split(r.check_out_at)} />
        </Card>

        <form action={setReservationStatus.bind(null, r.id, r.status === "cancelled" ? "confirmed" : "cancelled")}>
          {r.status === "cancelled" ? (
            <Button variant="secondary">Reactivar reserva</Button>
          ) : (
            <ConfirmButton variant="danger" message="¿Cancelar esta reserva?">Cancelar reserva</ConfirmButton>
          )}
        </form>
      </div>
    </div>
  );
}
