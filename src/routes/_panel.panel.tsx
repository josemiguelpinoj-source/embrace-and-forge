import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Car, CheckCircle2, Clock, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { estadoMantencion, formatearFecha } from "@/lib/mantenciones";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_panel/panel")({
  component: Panel,
});

function Panel() {
  const { data, isLoading } = useQuery({
    queryKey: ["resumen"],
    queryFn: async () => {
      const [vehiculos, mantenciones, documentos] = await Promise.all([
        supabase.from("vehiculos").select("*").order("created_at", { ascending: false }),
        supabase
          .from("mantenciones")
          .select("*")
          .order("fecha", { ascending: false })
          .limit(50),
        supabase.from("documentos").select("id, nombre, fecha_vencimiento"),
      ]);
      if (vehiculos.error) throw vehiculos.error;
      if (mantenciones.error) throw mantenciones.error;
      if (documentos.error) throw documentos.error;
      return {
        vehiculos: vehiculos.data,
        mantenciones: mantenciones.data,
        documentos: documentos.data,
      };
    },
  });

  if (isLoading || !data) {
    return <p className="font-mono text-sm text-muted-foreground">Cargando panel…</p>;
  }

  const kmPorVehiculo = new Map(data.vehiculos.map((v) => [v.id, v.kilometraje]));
  const conEstado = data.mantenciones.map((m) => ({
    ...m,
    estado: estadoMantencion(m, kmPorVehiculo.get(m.vehiculo_id)),
    vehiculo: data.vehiculos.find((v) => v.id === m.vehiculo_id),
  }));
  const vencidas = conEstado.filter((m) => m.estado === "vencida");
  const proximas = conEstado.filter((m) => m.estado === "proxima");

  const tarjetas = [
    { label: "Vehículos", valor: data.vehiculos.length, icon: Car },
    { label: "Mantenciones", valor: data.mantenciones.length, icon: Wrench },
    { label: "Vencidas", valor: vencidas.length, icon: AlertTriangle },
    { label: "Próximas", valor: proximas.length, icon: Clock },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Panel</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estado general de tus vehículos y mantenciones.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tarjetas.map((t) => (
          <div key={t.label} className="surface-panel p-5">
            <t.icon className="size-5 text-primary" />
            <p className="mt-3 font-display text-3xl font-bold">{t.valor}</p>
            <p className="text-sm text-muted-foreground">{t.label}</p>
          </div>
        ))}
      </div>

      <section className="surface-panel p-6">
        <h2 className="text-lg font-semibold">Alertas de mantención</h2>
        {vencidas.length === 0 && proximas.length === 0 ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-success" /> Sin mantenciones vencidas ni próximas.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {[...vencidas, ...proximas].slice(0, 8).map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{m.tipo}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.vehiculo ? `${m.vehiculo.marca} ${m.vehiculo.modelo} · ${m.vehiculo.patente}` : "Vehículo"}
                    {m.proxima_fecha ? ` · vence ${formatearFecha(m.proxima_fecha)}` : ""}
                    {m.proximo_km ? ` · a los ${m.proximo_km.toLocaleString("es-CL")} km` : ""}
                  </p>
                </div>
                <Badge variant={m.estado === "vencida" ? "destructive" : "secondary"}>
                  {m.estado === "vencida" ? "Vencida" : "Próxima"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.vehiculos.length === 0 && (
        <div className="surface-panel p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Aún no registras vehículos. Comienza agregando el primero.
          </p>
          <Button asChild className="mt-4">
            <Link to="/vehiculos">Agregar vehículo</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
