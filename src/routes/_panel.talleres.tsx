import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { MapPin, Navigation, ShieldCheck } from "lucide-react";
import type { Taller } from "@/components/MapaTalleres";

const MapaTalleres = lazy(() => import("@/components/MapaTalleres"));

export const Route = createFileRoute("/_panel/talleres")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Talleres cercanos | AutoPlan" },
      { name: "description", content: "Encuentra talleres mecánicos cercanos en un mapa." },
      { property: "og:title", content: "Talleres cercanos | AutoPlan" },
      { property: "og:description", content: "Encuentra talleres mecánicos cercanos en un mapa." },
    ],
  }),
  component: TalleresPage,
});

const CENTRO_DEFECTO = { lat: -33.4372, lon: -70.6506 };

function distanciaKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

type OsmElement = {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function TalleresPage() {
  const [centro, setCentro] = useState(CENTRO_DEFECTO);
  const [esMiUbicacion, setEsMiUbicacion] = useState(false);
  const [talleres, setTalleres] = useState<Taller[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buscar(c: { lat: number; lon: number }) {
    setCargando(true);
    setError(null);
    try {
      const q = `[out:json][timeout:25];(node["shop"="car_repair"](around:6000,${c.lat},${c.lon});way["shop"="car_repair"](around:6000,${c.lat},${c.lon});node["craft"="car_repair"](around:6000,${c.lat},${c.lon}););out center 60;`;
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: "data=" + encodeURIComponent(q),
      });
      if (!res.ok) throw new Error("No se pudo consultar OpenStreetMap");
      const json = (await res.json()) as { elements: OsmElement[] };
      const lista: Taller[] = json.elements
        .map((e) => {
          const lat = e.lat ?? e.center?.lat;
          const lon = e.lon ?? e.center?.lon;
          if (lat == null || lon == null) return null;
          const t = e.tags ?? {};
          const dir = [t["addr:street"], t["addr:housenumber"], t["addr:city"]].filter(Boolean).join(" ");
          return {
            id: String(e.id),
            nombre: t.name || t.brand || "Taller mecánico",
            lat,
            lon,
            direccion: dir || null,
            telefono: t.phone || null,
            clasificacion: null,
            distanciaKm: distanciaKm(c, { lat, lon }),
          } as Taller;
        })
        .filter((x): x is Taller => x !== null)
        .sort((a, b) => a.distanciaKm - b.distanciaKm);
      setTalleres(lista);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al buscar talleres");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    buscar(CENTRO_DEFECTO);
  }, []);

  function usarMiUbicacion() {
    if (!navigator.geolocation) {
      setError("Tu navegador no permite geolocalización.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setCentro(c);
        setEsMiUbicacion(true);
        buscar(c);
      },
      () => setError("No se pudo obtener tu ubicación; usamos Santiago Centro."),
      { timeout: 10000, enableHighAccuracy: true },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Talleres cercanos</h1>
          <p className="text-muted-foreground">
            Referencia: {esMiUbicacion ? "Mi ubicación" : "Santiago Centro"}
          </p>
        </div>
        <button
          onClick={usarMiUbicacion}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Navigation className="h-4 w-4" /> Buscar cerca de mí
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Suspense fallback={<div className="h-[420px] rounded-xl bg-muted" />}>
        <MapaTalleres key={`${centro.lat},${centro.lon}`} centro={centro} talleres={talleres} />
      </Suspense>

      <div className="space-y-2">
        {cargando && <p className="text-muted-foreground">Buscando talleres…</p>}
        {!cargando && talleres.length === 0 && (
          <p className="text-muted-foreground">No se encontraron talleres en 6 km.</p>
        )}
        {talleres.slice(0, 20).map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
            <div>
              <p className="font-medium">{t.nombre}</p>
              <p className="text-sm text-muted-foreground">
                <MapPin className="mr-1 inline h-3 w-3" />
                {t.direccion ?? "Sin dirección"} · {t.distanciaKm.toFixed(1)} km
                {t.telefono ? ` · ${t.telefono}` : ""}
              </p>
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
        Tu ubicación solo se usa localmente en tu navegador para consultar OpenStreetMap. No se guarda ni se comparte.
      </div>
    </div>
  );
}
