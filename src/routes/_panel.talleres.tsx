import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, MapPin, Navigation, Phone, ShieldCheck, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Taller } from "@/components/MapaTalleres";

const MapaTalleres = lazy(() => import("@/components/MapaTalleres"));

export const Route = createFileRoute("/_panel/talleres")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Talleres cercanos | AutoPlan" },
      { name: "description", content: "Talleres cercanos con distancia, horario y servicios." },
      { property: "og:title", content: "Talleres cercanos | AutoPlan" },
      { property: "og:description", content: "Talleres cercanos con distancia, horario y servicios." },
    ],
  }),
  component: TalleresPage,
});

const CENTRO_DEFECTO = { lat: -33.6117, lon: -70.5758 }; // Puente Alto

function distanciaKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function TalleresPage() {
  const [centro, setCentro] = useState(CENTRO_DEFECTO);
  const [esMiUbicacion, setEsMiUbicacion] = useState(false);
  const [buscandoUbic, setBuscandoUbic] = useState(false);
  const [servicio, setServicio] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: filas = [], isLoading } = useQuery({
    queryKey: ["talleres"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talleres")
        .select("id,nombre,direccion,comuna,telefono,lat,lon,horario,servicios")
        .eq("activo", true);
      if (error) throw error;
      return data;
    },
  });

  const servicios = useMemo(
    () => Array.from(new Set(filas.flatMap((f) => f.servicios))).sort(),
    [filas],
  );

  const talleres: Taller[] = useMemo(
    () =>
      filas
        .filter((f) => !servicio || f.servicios.includes(servicio))
        .map((f) => ({
          id: f.id,
          nombre: f.nombre,
          lat: f.lat,
          lon: f.lon,
          direccion: `${f.direccion}, ${f.comuna}`,
          telefono: f.telefono,
          horario: f.horario,
          servicios: f.servicios,
          distanciaKm: distanciaKm(centro, f),
        }))
        .sort((a, b) => a.distanciaKm - b.distanciaKm),
    [filas, centro, servicio],
  );

  function usarMiUbicacion() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Tu navegador no permite geolocalización.");
      return;
    }
    setBuscandoUbic(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCentro({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setEsMiUbicacion(true);
        setError(null);
        setBuscandoUbic(false);
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Permiso de ubicación denegado. Actívalo en tu navegador; mientras tanto usamos Puente Alto."
            : "No se pudo obtener tu ubicación; usamos Puente Alto como referencia.",
        );
        setBuscandoUbic(false);
      },
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 60000 },
    );
  }

  // Solicita la ubicación real automáticamente al abrir la página
  useEffect(() => {
    usarMiUbicacion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Talleres cercanos</h1>
          <p className="text-muted-foreground">
            {esMiUbicacion
              ? "Distancias en km desde tu ubicación actual"
              : "Distancias en km desde Puente Alto"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={servicio}
            onChange={(e) => setServicio(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
            aria-label="Filtrar por servicio"
          >
            <option value="">Todos los servicios</option>
            {servicios.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={usarMiUbicacion}
            disabled={buscandoUbic}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            <Navigation className="h-4 w-4" /> {buscandoUbic ? "Ubicando…" : "Buscar cerca de mí"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Suspense fallback={<div className="h-[420px] rounded-xl bg-muted" />}>
        <MapaTalleres key={`${centro.lat},${centro.lon}`} centro={centro} talleres={talleres} esMiUbicacion={esMiUbicacion} />
      </Suspense>

      <div className="space-y-2">
        {isLoading && <p className="text-muted-foreground">Cargando talleres…</p>}
        {!isLoading && talleres.length === 0 && (
          <p className="text-muted-foreground">No hay talleres con ese servicio.</p>
        )}
        {talleres.slice(0, 20).map((t) => (
          <div key={t.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card p-4">
            <div className="space-y-1">
              <p className="font-medium">
                {t.nombre}{" "}
                <span className="font-mono text-sm text-primary">{t.distanciaKm.toFixed(1)} km</span>
              </p>
              <p className="text-sm text-muted-foreground">
                <MapPin className="mr-1 inline h-3 w-3" />{t.direccion}
                {t.telefono && (<> · <Phone className="mx-1 inline h-3 w-3" />{t.telefono}</>)}
              </p>
              <p className="text-sm text-muted-foreground">
                <Clock className="mr-1 inline h-3 w-3" />{t.horario}
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {t.servicios.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    <Wrench className="h-3 w-3" />{s}
                  </span>
                ))}
              </div>
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lon}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-primary"
            >
              Cómo llegar
            </a>
          </div>
        ))}
      </div>

      <div className="flex gap-3 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
        Tu ubicación solo se usa en tu navegador para calcular distancias. No se guarda ni se comparte.
      </div>
    </div>
  );
}
