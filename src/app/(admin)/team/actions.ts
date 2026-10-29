"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

export type FormState = { error?: string; ok?: string } | undefined;

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

  // organization_id y role van en app_metadata: solo el servidor puede escribirlos
  // y el trigger handle_new_user los usa para crear el perfil en esta organización.
  const { error } = await createAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { organization_id: org.id, role },
    user_metadata: { full_name },
  });
  if (error) {
    return { error: /already|registered|exists/i.test(error.message) ? "Ya existe un usuario con ese email." : error.message };
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
