import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ClipboardCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { generarChecklist } from "@/lib/checklist.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_panel/checklist")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Checklist de diagnóstico con IA | AutoPlan" },
      { name: "description", content: "Genera un checklist de diagnóstico preliminar a partir de los síntomas del vehículo." },
      { property: "og:title", content: "Checklist de diagnóstico con IA | AutoPlan" },
      { property: "og:description", content: "Checklist preliminar para personal de taller." },
    ],
  }),
  component: ChecklistPage,
});

function renderLinea(l: string, i: number) {
  const negrita = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : <span key={j}>{p}</span>,
    );
  const casilla = l.match(/^\s*[-*]\s*\[( |x)\]\s*(.*)$/i);
  if (casilla)
    return (
      <label key={i} className="flex items-start gap-2 py-0.5">
        <input type="checkbox" defaultChecked={casilla[1] !== " "} className="mt-1 accent-primary" />
        <span>{negrita(casilla[2])}</span>
      </label>
    );
  if (/^#{1,4}\s/.test(l)) return <h3 key={i} className="mt-4 font-display font-semibold">{negrita(l.replace(/^#+\s/, ""))}</h3>;
  if (/^\s*[-*]\s/.test(l)) return <li key={i} className="ml-5 list-disc">{negrita(l.replace(/^\s*[-*]\s/, ""))}</li>;
  if (!l.trim()) return <div key={i} className="h-2" />;
  return <p key={i}>{negrita(l)}</p>;
}

function ChecklistPage() {
  const generar = useServerFn(generarChecklist);
  const [f, setF] = useState({ marca: "", modelo: "", anio: "", km: "", sintomas: "" });
  const [res, setRes] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (f.sintomas.trim().length < 10) return toast.error("Describe los síntomas (mínimo 10 caracteres).");
    setCargando(true);
    setRes(null);
    try {
      const r = await generar({
        data: {
          marca: f.marca,
          modelo: f.modelo,
          anio: f.anio ? Number(f.anio) : null,
          kilometraje: f.km ? Number(f.km) : null,
          sintomas: f.sintomas,
        },
      });
      setRes(r.checklist);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al generar el checklist");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-3xl font-semibold">
          <ClipboardCheck className="size-7 text-primary" /> Checklist de diagnóstico
        </h1>
        <p className="text-muted-foreground">Para personal de taller: ingresa el vehículo y los síntomas.</p>
      </div>

      <form onSubmit={enviar} className="grid gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-4">
        <div><Label>Marca</Label><Input required value={f.marca} onChange={(e) => setF({ ...f, marca: e.target.value })} /></div>
        <div><Label>Modelo</Label><Input required value={f.modelo} onChange={(e) => setF({ ...f, modelo: e.target.value })} /></div>
        <div><Label>Año</Label><Input type="number" value={f.anio} onChange={(e) => setF({ ...f, anio: e.target.value })} /></div>
        <div><Label>Kilometraje</Label><Input type="number" value={f.km} onChange={(e) => setF({ ...f, km: e.target.value })} /></div>
        <div className="md:col-span-4">
          <Label>Síntomas</Label>
          <Textarea
            rows={4}
            maxLength={2000}
            placeholder="Ej: ruido metálico al frenar, vibración en el volante sobre 80 km/h…"
            value={f.sintomas}
            onChange={(e) => setF({ ...f, sintomas: e.target.value })}
          />
        </div>
        <div className="md:col-span-4">
          <Button type="submit" disabled={cargando}>{cargando ? "Generando…" : "Generar checklist"}</Button>
        </div>
      </form>

      <div className="flex gap-3 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        <TriangleAlert className="size-5 shrink-0 text-primary" />
        El checklist es orientativo y no reemplaza la inspección física del técnico.
      </div>

      {res && <div className="rounded-xl border border-border bg-card p-5 text-sm leading-relaxed">{res.split("\n").map(renderLinea)}</div>}
    </div>
  );
}
