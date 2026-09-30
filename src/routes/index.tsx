import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Car,
  Wrench,
  BellRing,
  FileLock2,
  MapPin,
  ShieldCheck,
  Gauge,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AutoPlan — Gestión inteligente del mantenimiento vehicular" },
      {
        name: "description",
        content:
          "Registra vehículos, mantenciones y kilometraje, guarda documentos cifrados y encuentra talleres cercanos con tu ubicación.",
      },
      { property: "og:title", content: "AutoPlan — Mantenimiento vehicular inteligente" },
      {
        property: "og:description",
        content:
          "Centraliza vehículos, mantenciones, alertas preventivas, documentos y talleres cercanos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const funciones = [
  {
    icon: Car,
    titulo: "Registro de vehículos",
    texto: "Patente, marca, modelo, año y kilometraje actualizado de cada vehículo.",
  },
  {
    icon: Wrench,
    titulo: "Historial de mantenciones",
    texto: "Aceite, filtros, frenos, neumáticos y más, con costo y taller asociado.",
  },
  {
    icon: BellRing,
    titulo: "Alertas preventivas",
    texto: "Avisos de mantenciones próximas o vencidas por fecha y por kilometraje.",
  },
  {
    icon: FileLock2,
    titulo: "Documentos protegidos",
    texto: "Permiso, revisión técnica, seguro y licencia en almacenamiento privado.",
  },
  {
    icon: MapPin,
    titulo: "Talleres cercanos",
    texto: "Búsqueda por ubicación actual, con y sin clasificación, sobre mapa abierto.",
  },
  {
    icon: ShieldCheck,
    titulo: "Seguridad por diseño",
    texto: "Acceso autenticado, aislamiento por usuario y registro de auditoría.",
  },
];

function Landing() {
  const { session } = useAuth();

  return (
    <div className="min-h-screen hero-surface">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Gauge className="size-6 text-primary" />
          <span className="font-display text-lg font-bold tracking-tight">AutoPlan</span>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={session ? "/panel" : "/auth"}>
            {session ? "Ir al panel" : "Iniciar sesión"}
          </Link>
        </Button>
      </header>

      <section className="relative overflow-hidden">
        <div className="grid-tech pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Proyecto Integrado · INACAP
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-6xl">
            Gestión inteligente del{" "}
            <span className="text-gradient-primary">mantenimiento vehicular</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            AutoPlan centraliza vehículos, mantenciones, kilometraje y documentación, genera alertas
            preventivas y encuentra talleres cercanos a partir de tu ubicación actual.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to={session ? "/panel" : "/auth"}>
                Comenzar ahora <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/como-funciona">Cómo funciona</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {funciones.map((f) => (
            <article key={f.titulo} className="surface-panel p-6">
              <f.icon className="size-6 text-primary" />
              <h2 className="mt-4 text-lg font-semibold">{f.titulo}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center font-mono text-xs text-muted-foreground">
        AutoPlan · Claudio Neira &amp; José Pino · INACAP
      </footer>
    </div>
  );
}
