import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 4 * 1024 * 1024;

/** Sube una imagen a un bucket privado y devuelve su path. */
export async function uploadImage(bucket: "guest-documents" | "task-photos", folder: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("El archivo tiene que ser una imagen");
  if (file.size > MAX_BYTES) throw new Error("La imagen es demasiado grande");
  const path = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.jpg`;
  const { error } = await createAdminClient().storage.from(bucket).upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  return path;
}

/** URLs firmadas (1 hora) para mostrar imágenes de buckets privados. */
export async function signedUrls(bucket: "guest-documents" | "task-photos", paths: string[]): Promise<string[]> {
  if (paths.length === 0) return [];
  const { data } = await createAdminClient().storage.from(bucket).createSignedUrls(paths, 3600);
  return (data ?? []).map((d) => d.signedUrl ?? "").filter(Boolean);
}
