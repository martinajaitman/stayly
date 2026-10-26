"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string } | undefined;

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) return { error: "Email o contraseña incorrectos." };
  const next = String(formData.get("next") || "/dashboard");
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
    options: {
      // El trigger handle_new_user crea la organización y el perfil de admin.
      data: {
        full_name: String(formData.get("full_name") ?? ""),
        organization_name: String(formData.get("organization_name") ?? ""),
      },
    },
  });
  if (error) return { error: error.message };
  if (!data.session) return { message: "Te mandamos un email para confirmar la cuenta." };
  redirect("/dashboard");
}
