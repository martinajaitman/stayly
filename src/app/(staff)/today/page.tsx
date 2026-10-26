import { Logo } from "@/components/logo";
import { Card } from "@/components/ui";
import { getSession } from "@/lib/session";

// Vista del personal de limpieza/mantenimiento: se completa en la semana 3.
export default async function TodayPage() {
  const { profile } = await getSession();
  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <Logo />
      <h1 className="mt-6 text-xl font-semibold">Hola, {profile.full_name || "equipo"}</h1>
      <Card className="mt-4 text-sm text-muted">Tus tareas del día van a aparecer acá.</Card>
      <form action="/auth/signout" method="post" className="mt-6">
        <button className="text-sm text-muted">Cerrar sesión</button>
      </form>
    </main>
  );
}
