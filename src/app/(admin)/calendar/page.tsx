import clsx from "clsx";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/session";
import { addDays, toZonedDay, zonedToUtc } from "@/lib/time";
import type { BookingChannel, Reservation } from "@/lib/types";

const DAYS = 14;

const channelColor: Record<BookingChannel, string> = {
  airbnb: "bg-[#ffe1e3] text-[#a3263a] border-[#f5b9c0]",
  booking: "bg-accent-soft text-accent border-[#b9d0f5]",
  direct: "bg-ok-soft text-ok border-[#bfe3c5]",
  other: "bg-surface-muted text-muted border-border",
};

type Row = Pick<Reservation, "id" | "property_id" | "channel" | "check_in_at" | "check_out_at" | "status" | "confirmation_code"> & {
  guests: { full_name: string } | null;
};

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const { start: rawStart } = await searchParams;
  const { supabase, org } = await requireAdmin();
  const tz = org.timezone;
  const today = toZonedDay(new Date(), tz);
  const start = typeof rawStart === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawStart) ? rawStart : addDays(today, -1);
  const days = Array.from({ length: DAYS }, (_, i) => addDays(start, i));
  const end = addDays(start, DAYS);

  const [{ data: props }, { data: res }] = await Promise.all([
    supabase.from("properties").select("id, name").order("name"),
    supabase
      .from("reservations")
      .select("id, property_id, channel, check_in_at, check_out_at, status, confirmation_code, guests(full_name)")
      .neq("status", "cancelled")
      .lt("check_in_at", zonedToUtc(end, "00:00", tz).toISOString())
      .gt("check_out_at", zonedToUtc(start, "00:00", tz).toISOString()),
  ]);
  const reservations = (res ?? []) as unknown as Row[];
  const dayIndex = (iso: string) => days.indexOf(toZonedDay(new Date(iso), tz));
  const fmtDay = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", timeZone: "UTC" });

  return (
    <>
      <PageHeader
        title="Calendario"
        actions={
          <div className="flex items-center gap-1">
            <Link href={`/calendar?start=${addDays(start, -7)}`} className="rounded-xl p-2 hover:bg-surface-muted" aria-label="Semana anterior"><ChevronLeft size={18} /></Link>
            <Link href="/calendar" className="rounded-xl px-3 py-2 text-sm hover:bg-surface-muted">Hoy</Link>
            <Link href={`/calendar?start=${addDays(start, 7)}`} className="rounded-xl p-2 hover:bg-surface-muted" aria-label="Semana siguiente"><ChevronRight size={18} /></Link>
          </div>
        }
      />
      {!props?.length ? (
        <EmptyState>Cargá propiedades para ver el calendario.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <div className="grid min-w-[900px]" style={{ gridTemplateColumns: `160px repeat(${DAYS}, minmax(0, 1fr))` }}>
            <div className="sticky left-0 border-b border-border bg-surface" />
            {days.map((d) => (
              <div key={d} className={clsx("border-b border-l border-border px-1 py-2 text-center text-xs capitalize", d === today ? "bg-accent-soft font-semibold text-accent" : "text-muted")}>
                {fmtDay.format(new Date(`${d}T12:00:00Z`))}
              </div>
            ))}
            {props.map((p) => (
              <div key={p.id} className="contents">
                <Link href={`/properties/${p.id}`} className="sticky left-0 z-10 truncate border-b border-border bg-surface px-3 py-3 text-sm font-medium hover:text-accent">
                  {p.name}
                </Link>
                <div className="relative grid border-b border-border" style={{ gridColumn: `span ${DAYS}`, gridTemplateColumns: `repeat(${DAYS}, minmax(0, 1fr))` }}>
                  {days.map((d) => (
                    <div key={d} className={clsx("border-l border-border", d === today && "bg-accent-soft/40")} style={{ gridRow: 1 }} />
                  ))}
                  {reservations
                    .filter((r) => r.property_id === p.id)
                    .map((r) => {
                      const s = dayIndex(r.check_in_at);
                      const e = dayIndex(r.check_out_at);
                      // Barra de mitad del día de llegada a mitad del día de salida, recortada al rango visible.
                      const from = s < 0 ? 0 : s + 0.5;
                      const to = e < 0 ? DAYS : e + 0.5;
                      return (
                        <Link
                          key={r.id}
                          href={`/reservations/${r.id}`}
                          className={clsx("absolute top-2 bottom-2 truncate rounded-lg border px-2 text-xs leading-7 font-medium", channelColor[r.channel])}
                          style={{ left: `${(from / DAYS) * 100}%`, width: `${((to - from) / DAYS) * 100}%` }}
                          title={r.guests?.full_name ?? r.confirmation_code ?? ""}
                        >
                          {r.guests?.full_name || r.confirmation_code || "Reserva"}
                        </Link>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
