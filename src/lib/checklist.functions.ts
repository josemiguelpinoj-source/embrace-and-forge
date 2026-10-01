import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Entrada = z.object({
  marca: z.string().trim().min(1).max(60),
  modelo: z.string().trim().min(1).max(60),
  anio: z.number().int().min(1900).max(2100).nullable(),
  kilometraje: z.number().int().min(0).max(5_000_000).nullable(),
  sintomas: z.string().trim().min(10).max(2000),
});

const INSTRUCCIONES = `Eres un asistente técnico para personal de talleres mecánicos en Chile.
A partir de los datos del vehículo y los síntomas, genera una LISTA DE VERIFICACIÓN DE DIAGNÓSTICO PRELIMINAR en español, en Markdown, con estas secciones:
1. **Resumen del síntoma** (1-2 líneas).
2. **Nivel de prioridad**: Baja / Media / Alta / Crítica, con una línea de justificación. Si hay riesgo en frenos, dirección, fugas de combustible, sobrecalentamiento o humo, marca Crítica e indica no circular.
3. **Causas probables** ordenadas de más a menos probable.
4. **Checklist de inspección**: casillas "- [ ]" agrupadas por sistema, del chequeo más simple al más complejo, indicando herramienta o prueba (escáner OBD-II, multímetro, prueba de presión, etc.).
5. **Precauciones de seguridad** para el técnico.
6. **Repuestos o insumos posibles**.
Sé concreto, sin relleno, máximo ~450 palabras. Aclara que es orientativo y debe confirmarse con inspección.`;

export const generarChecklist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Entrada.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Falta configurar la clave de IA.");

    const input = `Vehículo: ${data.marca} ${data.modelo}${data.anio ? ` (${data.anio})` : ""}
Kilometraje: ${data.kilometraje ?? "no informado"} km
Síntomas reportados: ${data.sintomas}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions: INSTRUCCIONES,
        input,
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
      }),
    });

    if (!res.ok || !res.body) {
      const txt = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Demasiadas solicitudes. Intenta en un momento.");
      if (res.status === 402) throw new Error("No quedan créditos de IA disponibles.");
      console.error("AI Gateway", res.status, txt);
      throw new Error("No se pudo generar el checklist.");
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let texto = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lineas = buf.split("\n");
      buf = lineas.pop() ?? "";
      for (const l of lineas) {
        if (!l.startsWith("data:")) continue;
        const p = l.slice(5).trim();
        if (!p || p === "[DONE]") continue;
        try {
          const ev = JSON.parse(p) as { type?: string; delta?: string; message?: string };
          if (ev.type === "response.output_text.delta" && ev.delta) texto += ev.delta;
          if (ev.type === "error" || ev.type === "response.failed") {
            throw new Error(ev.message ?? "La IA no pudo responder.");
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
    if (!texto.trim()) throw new Error("La IA no devolvió respuesta.");
    return { checklist: texto };
  });
