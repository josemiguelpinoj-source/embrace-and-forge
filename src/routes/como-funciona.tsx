import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/como-funciona")({
  head: () => ({
    meta: [
      { title: "Cómo funciona AutoPlan — flujo de uso y seguridad" },
      {
        name: "description",
        content:
          "Conoce el flujo de AutoPlan: registro de vehículos, mantenciones con alertas, documentos protegidos y búsqueda de talleres cercanos.",
      },
      { property: "og:title", content: "Cómo funciona AutoPlan" },
      {
        property: "og:description",
        content: "Flujo completo de AutoPlan y las medidas de seguridad que protegen tus datos.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComoFunciona,
});

const pasos = [
  {
    n: "01",
    t: "Crea tu cuenta",
    d: "Correo y contraseña o cuenta de Google. Cada cuenta ve únicamente su propia información.",
  },
  {
    n: "02",
    t: "Registra tus vehículos",
    d: "Patente, marca, modelo, año y kilometraje. Puedes actualizar el kilometraje cuando quieras.",
  },
  {
    n: "03",
    t: "Anota cada mantención",
    d: "Tipo de servicio, fecha, kilometraje, costo y taller. Define la próxima fecha o kilometraje.",
  },
  {
    n: "04",
    t: "Recibe alertas",
    d: "AutoPlan marca las mantenciones próximas y vencidas según fecha y kilometraje recorrido.",
  },
  {
    n: "05",
    t: "Guarda tus documentos",
    d: "Permiso de circulación, revisión técnica, seguro y licencia en un espacio privado y cifrado.",
  },
  {
    n: "06",
    t: "Encuentra talleres cercanos",
    d: "Con tu autorización, se usa tu ubicación solo en el momento de la búsqueda. No se guarda.",
  },
];

const seguridad = [
  "Acceso solo con sesión iniciada y verificación en el servidor.",
  "Aislamiento estricto: cada usuario accede exclusivamente a sus registros.",
  "Documentos en almacenamiento privado, con enlaces temporales de descarga.",
  "Validación de tipo y tamaño de archivo antes de guardar.",
  "Registro de auditoría de las acciones realizadas en la cuenta.",
  "Ubicación solicitada de forma explícita, opcional y sin historial.",
];

function ComoFunciona() {
  return (
    <div className="min-h-screen hero-surface">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <Link to="/" className="font-mono text-xs text-muted-foreground hover:text-primary">
          ← Volver
        </Link>
        <h1 className="mt-6 text-4xl font-bold">Cómo funciona AutoPlan</h1>
        <p className="mt-4 text-muted-foreground">
          Seis pasos para dejar de perder el historial de tu vehículo y encontrar taller cuando lo
          necesitas.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {pasos.map((p) => (
            <article key={p.n} className="surface-panel p-6">
              <span className="font-mono text-sm text-primary">{p.n}</span>
              <h2 className="mt-2 text-lg font-semibold">{p.t}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
            </article>
          ))}
        </div>

        <h2 className="mt-14 text-2xl font-bold">Seguridad y privacidad</h2>
        <ul className="mt-4 space-y-2">
          {seguridad.map((s) => (
            <li key={s} className="surface-panel px-4 py-3 text-sm text-muted-foreground">
              {s}
            </li>
          ))}
        </ul>

        <div className="mt-12">
          <Button asChild size="lg">
            <Link to="/auth">Crear mi cuenta</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
