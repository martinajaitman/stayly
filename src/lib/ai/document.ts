import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

const DocumentFields = z.object({
  is_identity_document: z.boolean().describe("true si la imagen es un DNI, pasaporte o documento de identidad legible"),
  full_name: z.string().nullable().describe("Nombres y apellidos tal como figuran, con mayúscula inicial (no todo en mayúsculas)"),
  document_type: z.enum(["DNI", "Pasaporte", "Otro"]).nullable(),
  document_number: z.string().nullable().describe("Número de documento sin puntos ni espacios"),
  nationality: z.string().nullable().describe("Nacionalidad o país emisor, en español (ej: Argentina, Brasil, Estados Unidos)"),
});
export type DocumentData = z.infer<typeof DocumentFields>;

/**
 * Lee los datos de un documento de identidad desde una foto. Devuelve null si
 * no se pudo (la carga manual del check-in sigue funcionando igual).
 */
export async function extractDocumentFields(image: File): Promise<DocumentData | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const mediaType = image.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mediaType)) return null;
  const data = Buffer.from(await image.arrayBuffer()).toString("base64");

  try {
    const response = await new Anthropic().beta.messages.parse({
      model: "claude-sonnet-5-5",
      max_tokens: 2000,
      output_config: { effort: "low", format: betaZodOutputFormat(DocumentFields) },
      // Si un clasificador de seguridad rechaza el pedido, la API lo reintenta en otro modelo.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data } },
            {
              type: "text",
              text: "Es la foto que un huésped subió de su propio documento para el check-in de un alojamiento. Extraé sus datos. Si algún campo no se lee con claridad, devolvelo como null en lugar de adivinar.",
            },
          ],
        },
      ],
    });
    if (response.stop_reason === "refusal") return null;
    const parsed = response.parsed_output;
    return parsed?.is_identity_document ? parsed : null;
  } catch (e) {
    if (e instanceof Anthropic.APIError) console.error("document extraction failed", e.status, e.message);
    else console.error("document extraction failed", e);
    return null;
  }
}
