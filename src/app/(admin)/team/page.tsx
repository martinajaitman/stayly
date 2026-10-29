import { ConfirmButton } from "@/components/confirm-button";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/session";
import { ROLE_LABEL, type Profile } from "@/lib/types";
import { removeStaff } from "./actions";
import { StaffForm } from "./staff-form";

export default async function TeamPage() {
  const { supabase, profile: me } = await requireAdmin();
  const { data } = await supabase.from("profiles").select("id, full_name, role").order("role").order("full_name");
  const people = (data ?? []) as Pick<Profile, "id" | "full_name" | "role">[];

  return (
    <div className="max-w-3xl">
      <PageHeader title="Equipo" subtitle="Personal de limpieza y mantenimiento de tu organización" />
      <Card className="mb-6 divide-y divide-border p-0">
        {people.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="font-medium">{p.full_name || "Sin nombre"}</span>
              <Badge tone={p.role === "admin" ? "blue" : p.role === "cleaner" ? "yellow" : "neutral"}>{ROLE_LABEL[p.role]}</Badge>
              {p.id === me.id && <span className="text-xs text-muted">(vos)</span>}
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
      <StaffForm />
    </div>
  );
}
