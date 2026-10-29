import Link from "next/link";
import { BedDouble, Bot, ClipboardCheck, KeyRound, Smartphone, Wrench } from "lucide-react";
import { Logo } from "@/components/logo";

const FEATURES = [
  { icon: BedDouble, title: "Reservas centralizadas", text: "Airbnb, Booking y directas en un solo calendario." },
  { icon: KeyRound, title: "Check-in digital", text: "El huésped sube su documento, acepta las normas y recibe el código." },
  { icon: Bot, title: "Asistente para huéspedes", text: "Responde consultas y convierte problemas en incidencias." },
  { icon: Wrench, title: "Profesionales automáticos", text: "Pedimos presupuestos, elegimos el mejor dentro de tu tope y coordinamos la visita." },
  { icon: ClipboardCheck, title: "Limpieza al check-out", text: "La tarea se genera sola y el personal la completa desde el celular." },
  { icon: Smartphone, title: "App para tu equipo", text: "Administración, limpieza y técnicos, cada uno con lo suyo." },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:py-14">
      <header className="mb-14 flex items-center justify-between">
        <Logo size={36} />
        <Link href="/login" className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white">
          Ingresar a la app
        </Link>
      </header>

      <section className="mb-14 max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Automatizamos todo lo que ocurre entre la reserva y el check-out.</h1>
        <p className="mt-4 text-lg text-muted">
          StayAdmin es el sistema operativo de la estadía para administradores de alquileres temporarios: más propiedades, menos trabajo manual.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/login" className="rounded-xl bg-brand px-5 py-3 font-medium text-white">Soy administrador o parte del equipo</Link>
          <Link href="/stay/demo-ph7" className="rounded-xl border border-border bg-surface px-5 py-3 font-medium">Ver la página de un huésped</Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-border bg-surface p-5">
            <Icon className="text-brand" />
            <h2 className="mt-3 font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </div>
        ))}
      </section>

      <p className="mt-14 text-center text-sm text-muted">One platform. One guest journey. Zero unnecessary manual work.</p>
    </main>
  );
}
