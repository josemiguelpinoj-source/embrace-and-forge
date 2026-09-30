import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { registrarAuditoria } from "@/lib/auditoria";
import {
  TIPOS_MANTENCION,
  estadoMantencion,
  formatearCLP,
  formatearFecha,
} from "@/lib/mantenciones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_panel/mantenciones")({
  component: Mantenciones,
});

function Mantenciones() {
  const qc = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState<string>("todos");

  const { data: vehiculos = [] } = useQuery({
    queryKey: ["vehiculos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehiculos").select("*").order("marca");
      if (error) throw error;
      return data;
    },
  });

  const { data: mantenciones = [], isLoading } = useQuery({
    queryKey: ["mantenciones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mantenciones")
        .select("*")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const crear = useMutation({
    mutationFn: async (form: FormData) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sesión no válida");
      const { data, error } = await supabase
        .from("mantenciones")
        .insert({
          user_id: auth.user.id,
          vehiculo_id: String(form.get("vehiculo_id")),
          tipo: String(form.get("tipo")),
          descripcion: String(form.get("descripcion") || "").trim() || null,
          fecha: String(form.get("fecha")),
          kilometraje: Number(form.get("kilometraje")),
          costo: form.get("costo") ? Number(form.get("costo")) : null,
          taller: String(form.get("taller") || "").trim() || null,
          proxima_fecha: String(form.get("proxima_fecha") || "") || null,
          proximo_km: form.get("proximo_km") ? Number(form.get("proximo_km")) : null,
        })
        .select()
        .single();
      if (error) throw error;
      await registrarAuditoria("crear", "mantencion", data.id, { tipo: data.tipo });
      return data;
    },
    onSuccess: () => {
      toast.success("Mantención registrada.");
      setAbierto(false);
      qc.invalidateQueries({ queryKey: ["mantenciones"] });
      qc.invalidateQueries({ queryKey: ["resumen"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mantenciones").delete().eq("id", id);
      if (error) throw error;
      await registrarAuditoria("eliminar", "mantencion", id);
    },
    onSuccess: () => {
      toast.success("Mantención eliminada.");
      qc.invalidateQueries({ queryKey: ["mantenciones"] });
      qc.invalidateQueries({ queryKey: ["resumen"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const kmPorVehiculo = new Map(vehiculos.map((v) => [v.id, v.kilometraje]));
  const lista = mantenciones.filter((m) => filtro === "todos" || m.vehiculo_id === filtro);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Mantenciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Historial completo de servicios y próximos vencimientos.
          </p>
        </div>
        <Dialog open={abierto} onOpenChange={setAbierto}>
          <DialogTrigger asChild>
            <Button disabled={vehiculos.length === 0}>
              <Plus className="size-4" /> Registrar mantención
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva mantención</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                crear.mutate(new FormData(e.currentTarget));
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="vehiculo_id">Vehículo</Label>
                <select
                  id="vehiculo_id"
                  name="vehiculo_id"
                  required
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {vehiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.marca} {v.modelo} — {v.patente}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <select
                    id="tipo"
                    name="tipo"
                    required
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {TIPOS_MANTENCION.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha">Fecha</Label>
                  <Input id="fecha" name="fecha" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kilometraje">Kilometraje</Label>
                  <Input id="kilometraje" name="kilometraje" type="number" min={0} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costo">Costo (CLP)</Label>
                  <Input id="costo" name="costo" type="number" min={0} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proxima_fecha">Próxima fecha</Label>
                  <Input id="proxima_fecha" name="proxima_fecha" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proximo_km">Próximo km</Label>
                  <Input id="proximo_km" name="proximo_km" type="number" min={0} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taller">Taller</Label>
                <Input id="taller" name="taller" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea id="descripcion" name="descripcion" rows={3} />
              </div>
              <Button type="submit" className="w-full" disabled={crear.isPending}>
                Guardar mantención
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {vehiculos.length === 0 && (
        <div className="surface-panel p-8 text-center text-sm text-muted-foreground">
          Primero registra un vehículo en{" "}
          <Link to="/vehiculos" className="text-primary underline">
            Vehículos
          </Link>
          .
        </div>
      )}

      {vehiculos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={filtro === "todos" ? "default" : "secondary"}
            onClick={() => setFiltro("todos")}
          >
            Todos
          </Button>
          {vehiculos.map((v) => (
            <Button
              key={v.id}
              size="sm"
              variant={filtro === v.id ? "default" : "secondary"}
              onClick={() => setFiltro(v.id)}
            >
              {v.patente}
            </Button>
          ))}
        </div>
      )}

      {isLoading ? (
        <p className="font-mono text-sm text-muted-foreground">Cargando…</p>
      ) : lista.length === 0 ? (
        <div className="surface-panel p-10 text-center text-sm text-muted-foreground">
          Sin mantenciones registradas.
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((m) => {
            const estado = estadoMantencion(m, kmPorVehiculo.get(m.vehiculo_id));
            const v = vehiculos.find((x) => x.id === m.vehiculo_id);
            return (
              <article key={m.id} className="surface-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold">{m.tipo}</h2>
                      {estado !== "ok" && (
                        <Badge variant={estado === "vencida" ? "destructive" : "secondary"}>
                          {estado === "vencida" ? "Vencida" : "Próxima"}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {v ? `${v.marca} ${v.modelo} · ${v.patente}` : "Vehículo"} ·{" "}
                      {formatearFecha(m.fecha)} · {m.kilometraje.toLocaleString("es-CL")} km
                    </p>
                    {m.descripcion && (
                      <p className="mt-2 text-sm text-muted-foreground">{m.descripcion}</p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Costo: {formatearCLP(m.costo)}
                      {m.taller ? ` · Taller: ${m.taller}` : ""}
                      {m.proxima_fecha ? ` · Próxima: ${formatearFecha(m.proxima_fecha)}` : ""}
                      {m.proximo_km ? ` · Próx. km: ${m.proximo_km.toLocaleString("es-CL")}` : ""}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("¿Eliminar esta mantención?")) eliminar.mutate(m.id);
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
