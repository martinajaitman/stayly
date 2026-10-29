"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { syncProperty, type SyncResult } from "@/lib/ical/sync";
import { requireAdmin } from "@/lib/session";

export type FormState = { error?: string; ok?: string } | undefined;

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

const json = <T extends z.ZodTypeAny>(schema: T) =>
  z.string().transform((s, ctx) => {
    try {
      return schema.parse(JSON.parse(s || "[]"));
    } catch {
      ctx.addIssue({ code: "custom", message: "JSON inválido" });
      return z.NEVER;
    }
  });

const propertySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  address: z.string().trim(),
  capacity: z.coerce.number().int().min(1),
  bedrooms: z.coerce.number().int().min(0),
  wifi_ssid: z.string().trim(),
  wifi_password: z.string().trim(),
  house_rules: z.string().trim(),
  checkin_time: z.string().regex(/^\d{2}:\d{2}/),
  checkout_time: z.string().regex(/^\d{2}:\d{2}/),
  access_instructions: z.string().trim(),
  access_code: z.string().trim(),
  keys_info: z.string().trim(),
  manager_contact: z.string().trim(),
  default_cleaner_id: z.string().transform((v) => v || null),
  recommendations: json(z.array(z.object({ category: z.string(), name: z.string(), description: z.string() }))),
  faq: json(z.array(z.object({ question: z.string(), answer: z.string() }))),
});

export async function saveProperty(id: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const { supabase, org } = await requireAdmin();
  const parsed = propertySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const icalUrls = lines(formData.get("ical_urls"));
  const badUrl = icalUrls.find((u) => !/^https?:\/\//.test(u));
  if (badUrl) return { error: `URL de iCal inválida: ${badUrl}` };

  const values = {
    ...parsed.data,
    amenities: lines(formData.get("amenities")),
    ical_urls: icalUrls,
    recommendations: parsed.data.recommendations.filter((r) => r.name.trim()),
    faq: parsed.data.faq.filter((f) => f.question.trim()),
  };

  if (id) {
    const { error } = await supabase.from("properties").update(values).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath(`/properties/${id}`);
    return { ok: "Cambios guardados." };
  }

  const { data, error } = await supabase
    .from("properties")
    .insert({ ...values, organization_id: org.id })
    .select("id")
    .single();
  if (error) return { error: error.message };
  redirect(`/properties/${data.id}`);
}

export async function deleteProperty(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) throw new Error(error.message);
  redirect("/properties");
}

export async function syncPropertyNow(id: string): Promise<SyncResult | { error: string }> {
  const { supabase, org } = await requireAdmin();
  const { data: property, error } = await supabase
    .from("properties")
    .select("id, organization_id, ical_urls, checkin_time, checkout_time")
    .eq("id", id)
    .single();
  if (error || !property) return { error: error?.message ?? "Propiedad no encontrada" };
  const result = await syncProperty(supabase, property, org.timezone);
  revalidatePath(`/properties/${id}`);
  revalidatePath("/reservations");
  return result;
}
