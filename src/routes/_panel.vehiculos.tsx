import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Car, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { registrarAuditoria } from "@/lib/auditoria";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_panel/vehiculos")({
  component: Vehiculos,
});

function Vehiculos() {
  const qc = useQueryClient();
  const [abierto, setAbierto] = useState(false);

  const { data: vehiculos = [], isLoading } = useQuery({
    queryKey: ["vehiculos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehiculos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const crear = useMutation({
    mutationFn: async (form: FormData) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sesión no válida");
      const { data, error } = await supabase
        .from("vehiculos")
        .insert({
          user_id: auth.user.id,
          patente: String(form.get("patente")).toUpperCase().trim(),
          marca: String(form.get("marca")).trim(),
          modelo: String(form.get("modelo")).trim(),
          anio: Number(form.get("anio")),
          color: String(form.get("color") || "").trim() || null,
          kilometraje: Number(form.get("kilometraje") || 0),
        })
        .select()
        .single();
      if (error) throw error;
      await registrarAuditoria("crear", "vehiculo", data.id, { patente: data.patente });
      return data;
    },
    onSuccess: () => {
      toast.success("Vehículo registrado.");
      setAbierto(false);
      qc.invalidateQueries({ queryKey: ["vehiculos"] });
      qc.invalidateQueries({ queryKey: ["resumen"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actualizarKm = useMutation({
    mutationFn: async ({ id, km }: { id: string; km: number }) => {
      const { error } = await supabase.from("vehiculos").update({ kilometraje: km }).eq("id", id);
      if (error) throw error;
      await registrarAuditoria("actualizar_kilometraje", "vehiculo", id, { km });
    },
    onSuccess: () => {
      toast.success("Kilometraje actualizado.");
      qc.invalidateQueries({ queryKey: ["vehiculos"] });
      qc.invalidateQueries({ queryKey: ["resumen"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehiculos").delete().eq("id", id);
      if (error) throw error;
      await registrarAuditoria("eliminar", "vehiculo", id);
    },
    onSuccess: () => {
      toast.success("Vehículo eliminado.");
      qc.invalidateQueries({ queryKey: ["vehiculos"] });
      qc.invalidateQueries({ queryKey: ["resumen"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Vehículos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tus vehículos registrados y su kilometraje actual.
          </p>
        </div>
        <Dialog open={abierto} onOpenChange={setAbierto}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Agregar vehículo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo vehículo</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                crear.mutate(new FormData(e.currentTarget));
              }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patente">Patente</Label>
                  <Input id="patente" name="patente" required maxLength={10} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="anio">Año</Label>
                  <Input id="anio" name="anio" type="number" min={1900} max={2100} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="marca">Marca</Label>
                  <Input id="marca" name="marca" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input id="modelo" name="modelo" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input id="color" name="color" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kilometraje">Kilometraje</Label>
                  <Input
                    id="kilometraje"
                    name="kilometraje"
                    type="number"
                    min={0}
                    defaultValue={0}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={crear.isPending}>
                Guardar vehículo
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="font-mono text-sm text-muted-foreground">Cargando…</p>
      ) : vehiculos.length === 0 ? (
        <div className="surface-panel p-10 text-center text-sm text-muted-foreground">
          Todavía no hay vehículos registrados.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {vehiculos.map((v) => (
            <article key={v.id} className="surface-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Car className="size-5 text-primary" />
                  <div>
                    <h2 className="font-semibold">
                      {v.marca} {v.modelo}
                    </h2>
                    <p className="font-mono text-xs uppercase text-muted-foreground">
                      {v.patente} · {v.anio}
                      {v.color ? ` · ${v.color}` : ""}
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("¿Eliminar este vehículo y todo su historial?")) {
                      eliminar.mutate(v.id);
                    }
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
              <form
                className="mt-5 flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const km = Number(new FormData(e.currentTarget).get("km"));
                  actualizarKm.mutate({ id: v.id, km });
                }}
              >
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`km-${v.id}`}>Kilometraje actual</Label>
                  <Input
                    id={`km-${v.id}`}
                    name="km"
                    type="number"
                    min={0}
                    defaultValue={v.kilometraje}
                    required
                  />
                </div>
                <Button type="submit" variant="secondary">
                  Actualizar
                </Button>
              </form>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
