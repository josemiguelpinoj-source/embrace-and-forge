import { supabase } from "@/integrations/supabase/client";

/** Registra un evento de auditoría del usuario actual (best-effort). */
export async function registrarAuditoria(
  accion: string,
  entidad: string,
  entidadId?: string | null,
  detalle: Record<string, unknown> = {},
) {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return;
  await supabase.from("auditoria").insert({
    user_id: userId,
    accion,
    entidad,
    entidad_id: entidadId ?? null,
    detalle: detalle as never,
  });
}
