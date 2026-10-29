import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AlertTriangle, ChevronRight, KeyRound, LogOut, MapPin, MessageCircle, ScrollText, Star, Wifi } from "lucide-react";
import { Button } from "@/components/ui";
import { getPortalReservation, isArrivalDay } from "@/lib/portal";
import { toZonedDay, toZonedTime } from "@/lib/time";
import { confirmArrival } from "./actions";

function dayLabel(iso: string, tz: string) {
  const day = toZonedDay(new Date(iso), tz);
  const today = toZonedDay(new Date(), tz);
  const tomorrow = toZonedDay(new Date(Date.now() + 86400000), tz);
  if (day === today) return "Hoy";
  if (day === tomorrow) return "Mañana";
  const s = new Intl.DateTimeFormat("es-AR", { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Row({ icon, title, subtitle, children }: { icon: ReactNode; title: string; subtitle: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl border border-border bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-4 px-4 py-4">
        <span className="text-accent">{icon}</span>
        <span className="flex-1">
          <span className="block font-medium">{title}</span>
          <span className="block text-sm text-muted">{subtitle}</span>
        </span>
        <ChevronRight size={18} className="text-muted transition group-open:rotate-90" />
      </summary>
      <div className="border-t border-border px-4 py-4 text-sm leading-relaxed">{children}</div>
    </details>
  );
}

export default async function StayPage({ params, searchParams }: PageProps<"/stay/[token]">) {
  const { token } = await params;
  const { reported } = await searchParams;
  const r = await getPortalReservation(token);
  if (!r) notFound();
  const p = r.properties;
  const tz = r.organizations.timezone;
  const arrival = isArrivalDay(r);
  const inside = r.status === "checked_in";
  const firstName = r.guests?.full_name?.split(" ")[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="mb-2">
        <p className="text-sm text-muted">{firstName ? `Hola, ${firstName}. ` : ""}Tu estadía en</p>
        <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>
      </div>

      <div className="flex justify-between rounded-2xl bg-accent-soft px-5 py-4 text-accent">
        <div>
          <p className="text-sm">Check-in</p>
          <p className="text-lg font-semibold">{dayLabel(r.check_in_at, tz)}, {toZonedTime(new Date(r.check_in_at), tz)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm">Check-out</p>
          <p className="text-lg font-semibold">{dayLabel(r.check_out_at, tz)}, {toZonedTime(new Date(r.check_out_at), tz)}</p>
        </div>
      </div>

      {typeof reported === "string" && (
        <p className="rounded-2xl bg-ok-soft px-4 py-3 text-sm text-ok">
          Recibimos tu reporte (incidencia #{reported}). Ya le avisamos al equipo, te contactan a la brevedad.
        </p>
      )}

      {/* Paso siguiente según el momento de la estadía */}
      {r.status === "confirmed" && !r.rules_accepted_at && (
        <Link href={`/stay/${token}/checkin`} className="rounded-2xl bg-accent px-5 py-4 text-center font-medium text-white">
          Hacer check-in digital
          <span className="block text-sm font-normal opacity-90">2 minutos · necesitás tu DNI o pasaporte</span>
        </Link>
      )}
      {r.status === "confirmed" && r.rules_accepted_at && !arrival && (
        <p className="rounded-2xl bg-ok-soft px-4 py-3 text-sm text-ok">
          ✓ Registro completo. El código de acceso se habilita el día de tu llegada.
        </p>
      )}
      {r.status === "confirmed" && r.rules_accepted_at && arrival && (
        <form action={confirmArrival.bind(null, token)}>
          <Button className="w-full py-4 text-base">Ya llegué: mostrar código de acceso</Button>
        </form>
      )}
      {inside && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="flex items-center gap-2 font-medium"><KeyRound size={18} className="text-accent" /> Tu código de acceso</p>
          <p className="mt-3 rounded-xl bg-accent-soft py-4 text-center text-3xl font-semibold tracking-wider text-accent">
            {p.access_code || "Consultá al anfitrión"}
          </p>
          {p.access_instructions && <p className="mt-4 text-sm leading-relaxed whitespace-pre-line">{p.access_instructions}</p>}
          {p.keys_info && <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted">{p.keys_info}</p>}
        </div>
      )}
      {r.status === "checked_out" && (
        <div className="rounded-2xl border border-border bg-surface p-5 text-center">
          <Star className="mx-auto text-brand" />
          <p className="mt-2 font-medium">¡Gracias por hospedarte con nosotros!</p>
          <p className="mt-1 text-sm text-muted">Nos ayudaría mucho que dejaras una reseña en la plataforma donde reservaste.</p>
        </div>
      )}

      {inside && (
        <Row icon={<Wifi size={20} />} title="Wi-Fi y amenities" subtitle="Red, contraseña, equipamiento">
          <p>Red: <strong>{p.wifi_ssid || "—"}</strong></p>
          <p>Contraseña: <strong className="font-mono">{p.wifi_password || "—"}</strong></p>
          {p.amenities.length > 0 && <p className="mt-3 text-muted">{p.amenities.join(" · ")}</p>}
        </Row>
      )}
      {!inside && p.amenities.length > 0 && (
        <Row icon={<Wifi size={20} />} title="Amenities" subtitle="Equipamiento del alojamiento">
          <p>{p.amenities.join(" · ")}</p>
          <p className="mt-2 text-muted">El Wi-Fi y el acceso aparecen acá después del check-in.</p>
        </Row>
      )}
      {p.recommendations.length > 0 && (
        <Row icon={<MapPin size={20} />} title="Recomendaciones cercanas" subtitle="Restaurantes, supermercados, transporte">
          <ul className="flex flex-col gap-3">
            {p.recommendations.map((rec, i) => (
              <li key={i}>
                <span className="text-xs text-muted uppercase">{rec.category}</span>
                <p className="font-medium">{rec.name}</p>
                <p className="text-muted">{rec.description}</p>
              </li>
            ))}
          </ul>
        </Row>
      )}
      {(p.house_rules || p.faq.length > 0) && (
        <Row icon={<ScrollText size={20} />} title="Normas y preguntas frecuentes" subtitle={`Check-out a las ${p.checkout_time.slice(0, 5)}`}>
          {p.house_rules && <p className="whitespace-pre-line">{p.house_rules}</p>}
          {p.faq.map((f, i) => (
            <div key={i} className="mt-3">
              <p className="font-medium">{f.question}</p>
              <p className="text-muted">{f.answer}</p>
            </div>
          ))}
        </Row>
      )}

      {r.status !== "checked_out" && (
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Link href={`/stay/${token}/report`} className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-surface px-3 py-4 text-sm font-medium">
            <AlertTriangle size={20} className="text-danger" /> Reportar un problema
          </Link>
          {inside ? (
            <Link href={`/stay/${token}/checkout`} className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-surface px-3 py-4 text-sm font-medium">
              <LogOut size={20} className="text-accent" /> Hacer check-out
            </Link>
          ) : (
            p.manager_contact && (
              <a href={`https://wa.me/${p.manager_contact.replace(/\D/g, "")}`} className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-surface px-3 py-4 text-sm font-medium">
                <MessageCircle size={20} className="text-ok" /> Escribir al anfitrión
              </a>
            )
          )}
        </div>
      )}
    </div>
  );
}
