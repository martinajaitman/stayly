import { ConfirmButton } from "@/components/confirm-button";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/session";
import { SERVICE_LABEL, type ServiceType, type UserRole } from "@/lib/types";
import { removeStaff } from "./actions";
import { StaffForm } from "./staff-form";

type Person = { id: string; full_name: string; role: UserRole; phone: string | null; specialties: ServiceType[]; zone: string };

const GROUPS: { role: UserRole; title: string }[] = [
  { role: "maintenance", title: "Profesionales" },
  { role: "cleaner", title: "Limpieza" },
  { role: "admin", title: "Administradores" },
];

export default async function TeamPage() {
  const { supabase, profile: me } = await requireAdmin();
  const [{ data }, { data: availability }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, phone, specialties, zone").order("full_name"),
    supabase.from("professional_availability").select("profile_id"),
  ]);
  const people = (data ?? []) as Person[];
  const blocks = new Map<string, number>();
  for (const a of availability ?? []) blocks.set(a.profile_id, (blocks.get(a.profile_id) ?? 0) + 1);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Equipo" subtitle="Tu gente de limpieza y tus profesionales. Todos usan la app de StayAdmin." />
      {GROUPS.map((g) => {
        const rows = people.filter((p) => p.role === g.role);
        return (
          <section key={g.role} className="mb-6">
            <h2 className="mb-2 text-sm font-medium text-muted">{g.title} · {rows.length}</h2>
            <Card className="divide-y divide-border p-0">
              {rows.length === 0 && <p className="px-5 py-4 text-sm text-muted">Todavía no cargaste {g.title.toLowerCase()}.</p>}
              {rows.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {p.full_name || "Sin nombre"} {p.id === me.id && <span className="text-xs font-normal text-muted">(vos)</span>}
                    </p>
                    {g.role === "maintenance" && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {p.specialties.map((s) => <Badge key={s} tone="blue">{SERVICE_LABEL[s]}</Badge>)}
                        <span className="text-xs text-muted">
                          {p.zone && `${p.zone} · `}
                          {blocks.get(p.id) ? `${blocks.get(p.id)} turnos por semana` : "sin disponibilidad cargada"}
                        </span>
                      </div>
                    )}
                    {p.phone && <p className="text-xs text-muted">{p.phone}</p>}
                  </div>
                  {p.id !== me.id && (
                    <form action={removeStaff.bind(null, p.id)}>
                      <ConfirmButton variant="ghost" className="text-xs text-danger" message={`¿Quitar a ${p.full_name} del equipo? Ya no va a poder entrar.`}>
                        Quitar
                      </ConfirmButton>
                    </form>
                  )}
                </div>
              ))}
            </Card>
          </section>
        );
      })}
      <StaffForm />
    </div>
  );
}
