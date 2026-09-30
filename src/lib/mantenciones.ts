export type EstadoAlerta = "vencida" | "proxima" | "ok";

export type MantencionBase = {
  proxima_fecha: string | null;
  proximo_km: number | null;
};

/** Determina el estado de una mantención según fecha y kilometraje del vehículo. */
export function estadoMantencion(
  m: MantencionBase,
  kilometrajeActual: number | null | undefined,
): EstadoAlerta {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (m.proxima_fecha) {
    const fecha = new Date(`${m.proxima_fecha}T00:00:00`);
    const dias = Math.round((fecha.getTime() - hoy.getTime()) / 86400000);
    if (dias < 0) return "vencida";
    if (dias <= 30) return "proxima";
  }

  if (m.proximo_km != null && kilometrajeActual != null) {
    const faltan = m.proximo_km - kilometrajeActual;
    if (faltan <= 0) return "vencida";
    if (faltan <= 1000) return "proxima";
  }

  return "ok";
}

export const TIPOS_MANTENCION = [
  "Cambio de aceite",
  "Filtro de aire",
  "Filtro de combustible",
  "Frenos",
  "Neumáticos",
  "Batería",
  "Correa de distribución",
  "Revisión general",
  "Otro",
] as const;

export const TIPOS_DOCUMENTO = [
  "Permiso de circulación",
  "Revisión técnica",
  "Seguro obligatorio (SOAP)",
  "Póliza de seguro",
  "Licencia de conducir",
  "Padrón",
  "Boleta o factura",
  "Otro",
] as const;

export function formatearCLP(valor: number | null | undefined) {
  if (valor == null) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(valor);
}

export function formatearFecha(fecha: string | null | undefined) {
  if (!fecha) return "—";
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
