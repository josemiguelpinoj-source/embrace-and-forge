import { useEffect } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import fondoTaller from "@/assets/fondo-taller.jpg";
import bannerPanel from "@/assets/banner-panel.jpg";
import bannerVehiculos from "@/assets/banner-vehiculos.jpg";
import bannerMantenciones from "@/assets/banner-mantenciones.jpg";
import bannerDocumentos from "@/assets/banner-documentos.jpg";
import bannerTalleres from "@/assets/banner-talleres.jpg";
import bannerChecklist from "@/assets/banner-checklist.jpg";

const banners: Record<string, string> = {
  "/panel": bannerPanel,
  "/vehiculos": bannerVehiculos,
  "/mantenciones": bannerMantenciones,
  "/documentos": bannerDocumentos,
  "/talleres": bannerTalleres,
  "/checklist": bannerChecklist,
};
import { useQueryClient } from "@tanstack/react-query";
import { Car, ClipboardCheck, FileLock2, Gauge, LayoutDashboard, LogOut, MapPin, Wrench } from "lucide-react";
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
  { to: "/checklist", label: "Checklist IA", icon: ClipboardCheck },
] as const;

function PanelLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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

  const banner = banners[pathname] ?? bannerPanel;

  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-0 bg-cover bg-center opacity-25"
        style={{ backgroundImage: `url(${fondoTaller})` }}
      />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
      <div className="relative z-10">
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
        <div className="relative mb-8 h-36 overflow-hidden rounded-xl border border-border md:h-48">
          <img src={banner} alt="" width={1600} height={608} className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/10 to-transparent" />
        </div>
        <Outlet />
      </main>
      </div>
    </div>
  );
}
