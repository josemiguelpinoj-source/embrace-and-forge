import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileLock2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { registrarAuditoria } from "@/lib/auditoria";
import { TIPOS_DOCUMENTO, formatearFecha } from "@/lib/mantenciones";
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

export const Route = createFileRoute("/_panel/documentos")({
  component: Documentos,
});

const MIMES_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

function Documentos() {
  const qc = useQueryClient();
  const [abierto, setAbierto] = useState(false);

  const { data: vehiculos = [] } = useQuery({
    queryKey: ["vehiculos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehiculos").select("*").order("marca");
      if (error) throw error;
      return data;
    },
  });

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ["documentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const subir = useMutation({
    mutationFn: async (form: FormData) => {
      const archivo = form.get("archivo") as File;
      if (!archivo || archivo.size === 0) throw new Error("Selecciona un archivo.");
      if (!MIMES_PERMITIDOS.includes(archivo.type))
        throw new Error("Formato no permitido. Usa PDF, JPG, PNG o WEBP.");
      if (archivo.size > MAX_BYTES) throw new Error("El archivo supera los 10 MB.");

      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sesión no válida");

      const extension = archivo.name.split(".").pop() ?? "bin";
      const ruta = `${auth.user.id}/${crypto.randomUUID()}.${extension}`;

      const { error: upErr } = await supabase.storage
        .from("documentos")
        .upload(ruta, archivo, { contentType: archivo.type, upsert: false });
      if (upErr) throw upErr;

      const vehiculoId = String(form.get("vehiculo_id") || "");
      const { data, error } = await supabase
        .from("documentos")
        .insert({
          user_id: auth.user.id,
          vehiculo_id: vehiculoId || null,
          tipo: String(form.get("tipo")),
          nombre: String(form.get("nombre") || archivo.name),
          storage_path: ruta,
          mime_type: archivo.type,
          tamano_bytes: archivo.size,
          fecha_vencimiento: String(form.get("fecha_vencimiento") || "") || null,
        })
        .select()
        .single();
      if (error) {
        await supabase.storage.from("documentos").remove([ruta]);
        throw error;
      }
      await registrarAuditoria("subir", "documento", data.id, { tipo: data.tipo });
      return data;
    },
    onSuccess: () => {
      toast.success("Documento guardado.");
      setAbierto(false);
      qc.invalidateQueries({ queryKey: ["documentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminar = useMutation({
    mutationFn: async (doc: { id: string; storage_path: string }) => {
      await supabase.storage.from("documentos").remove([doc.storage_path]);
      const { error } = await supabase.from("documentos").delete().eq("id", doc.id);
      if (error) throw error;
      await registrarAuditoria("eliminar", "documento", doc.id);
    },
    onSuccess: () => {
      toast.success("Documento eliminado.");
      qc.invalidateQueries({ queryKey: ["documentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function descargar(path: string) {
    const { data, error } = await supabase.storage.from("documentos").createSignedUrl(path, 60);
    if (error || !data) {
      toast.error("No se pudo generar el enlace de descarga.");
      return;
    }
    await registrarAuditoria("descargar", "documento", path);
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Documentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Almacenamiento privado. Solo tú puedes ver y descargar estos archivos.
          </p>
        </div>
        <Dialog open={abierto} onOpenChange={setAbierto}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Subir documento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo documento</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                subir.mutate(new FormData(e.currentTarget));
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <select
                  id="tipo"
                  name="tipo"
                  required
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {TIPOS_DOCUMENTO.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" name="nombre" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehiculo_id">Vehículo (opcional)</Label>
                <select
                  id="vehiculo_id"
                  name="vehiculo_id"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Sin vehículo</option>
                  {vehiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.marca} {v.modelo} — {v.patente}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha_vencimiento">Vence el (opcional)</Label>
                <Input id="fecha_vencimiento" name="fecha_vencimiento" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="archivo">Archivo (PDF o imagen, máx. 10 MB)</Label>
                <Input
                  id="archivo"
                  name="archivo"
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={subir.isPending}>
                {subir.isPending ? "Subiendo…" : "Guardar documento"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="font-mono text-sm text-muted-foreground">Cargando…</p>
      ) : documentos.length === 0 ? (
        <div className="surface-panel p-10 text-center text-sm text-muted-foreground">
          Aún no has guardado documentos.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {documentos.map((d) => {
            const v = vehiculos.find((x) => x.id === d.vehiculo_id);
            return (
              <article key={d.id} className="surface-panel flex items-start gap-4 p-5">
                <FileLock2 className="mt-1 size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">{d.nombre}</h2>
                  <p className="font-mono text-xs text-muted-foreground">
                    {d.tipo}
                    {v ? ` · ${v.patente}` : ""} · {(d.tamano_bytes / 1024).toFixed(0)} KB
                  </p>
                  {d.fecha_vencimiento && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Vence: {formatearFecha(d.fecha_vencimiento)}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => descargar(d.storage_path)}>
                    <Download className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("¿Eliminar este documento?")) eliminar.mutate(d);
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
