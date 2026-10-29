"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

export type FormState = { error?: string; ok?: string } | undefined;

const SERVICES = ["plumbing", "electricity", "gas", "air", "locksmith", "appliances", "internet", "general"];

const staffSchema = z.object({
  full_name: z.string().trim().min(2, "Completá el nombre"),
  email: z.email("Email inválido"),
  role: z.enum(["cleaner", "maintenance", "admin"]),
  password: z.string().min(8, "La contraseña tiene que tener al menos 8 caracteres"),
});

export async function createStaff(_: FormState, formData: FormData): Promise<FormState> {
  const { org } = await requireAdmin();
  const parsed = staffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { full_name, email, role, password } = parsed.data;
  const specialties = role === "maintenance" ? formData.getAll("specialties").map(String).filter((s) => SERVICES.includes(s)) : [];
  if (role === "maintenance" && specialties.length === 0) return { error: "Elegí al menos un rubro para el profesional" };
  const zone = String(formData.get("zone") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { organization_id: org.id, role },
    user_metadata: { full_name },
  });
  if (error || !data.user) {
    return { error: error && /already|registered|exists/i.test(error.message) ? "Ya existe un usuario con ese email." : (error?.message ?? "No se pudo crear el usuario") };
  }

  // Supabase inserta el usuario antes de guardar app_metadata, así que el trigger
  // handle_new_user lo trata como un registro público y le crea una organización
  // propia. Lo movemos a esta organización y borramos la que quedó vacía.
  const { data: created } = await admin.from("profiles").select("organization_id").eq("id", data.user.id).single();
  const { error: moveError } = await admin
    .from("profiles")
    .update({ organization_id: org.id, role, full_name, specialties, zone, phone })
    .eq("id", data.user.id);
  if (moveError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "No se pudo agregar a la organización. Probá de nuevo." };
  }
  if (created && created.organization_id !== org.id) {
    await admin.from("organizations").delete().eq("id", created.organization_id);
  }
  revalidatePath("/team");
  return { ok: `Listo. ${full_name} ya puede entrar con ${email} y la contraseña que elegiste.` };
}

export async function removeStaff(profileId: string) {
  const { supabase, profile } = await requireAdmin();
  if (profileId === profile.id) throw new Error("No podés eliminar tu propio usuario");
  const { data } = await supabase.from("profiles").select("id").eq("id", profileId).single();
  if (!data) throw new Error("Usuario no encontrado");
  // Borra el usuario de Auth; el perfil se borra en cascada y sus tareas quedan sin asignar.
  const { error } = await createAdminClient().auth.admin.deleteUser(profileId);
  if (error) throw new Error(error.message);
  revalidatePath("/team");
}
