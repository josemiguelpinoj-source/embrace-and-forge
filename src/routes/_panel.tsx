import { useEffect } from "react";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Car, FileLock2, Gauge, LayoutDashboard, LogOut, MapPin, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_panel")({
  ssr: false,
  component: PanelLayout,
});

const nav = [
  { to: "/panel", label: "Panel", icon: LayoutDashboard },
  { to: "/vehiculos", label: "Vehículos", icon: Car },
  { to: "/mantenciones", label: "Mantenciones", icon: Wrench },
  { to: "/documentos", label: "Documentos", icon: FileLock2 },
  { to: "/talleres", label: "Talleres", icon: MapPin },
] as const;

function PanelLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);

  async function cerrarSesion() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center hero-surface">
        <span className="font-mono text-sm text-muted-foreground">Cargando…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/panel" className="flex items-center gap-2">
            <Gauge className="size-5 text-primary" />
            <span className="font-display font-bold">AutoPlan</span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Button variant="ghost" size="sm" onClick={cerrarSesion}>
            <LogOut className="size-4" /> Salir
          </Button>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex shrink-0 items-center gap-1 rounded-md px-3 py-1.5 text-xs text-muted-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              <n.icon className="size-3.5" />
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
