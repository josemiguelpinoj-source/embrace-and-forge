CREATE TABLE public.talleres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  direccion TEXT NOT NULL,
  comuna TEXT NOT NULL,
  telefono TEXT,
  lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lon DOUBLE PRECISION NOT NULL CHECK (lon BETWEEN -180 AND 180),
  horario TEXT NOT NULL,
  servicios TEXT[] NOT NULL DEFAULT '{}',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.talleres TO authenticated;
GRANT ALL ON public.talleres TO service_role;
ALTER TABLE public.talleres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios ven talleres activos" ON public.talleres FOR SELECT TO authenticated USING (activo);
CREATE POLICY "Admins gestionan talleres" ON public.talleres FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT INSERT, UPDATE, DELETE ON public.talleres TO authenticated;

INSERT INTO public.talleres (nombre,direccion,comuna,telefono,lat,lon,horario,servicios) VALUES
('Taller Mecánico San Carlos','Av. Concha y Toro 1450','Puente Alto','+56 2 2850 1100',-33.6050,-70.5760,'Lun-Vie 08:30-18:30 · Sáb 09:00-13:00',ARRAY['Mecánica general','Frenos','Cambio de aceite']),
('Frenos y Embragues Gabriela','Av. Gabriela Oriente 2210','Puente Alto','+56 2 2851 2233',-33.5905,-70.5560,'Lun-Vie 09:00-19:00 · Sáb 09:00-14:00',ARRAY['Frenos','Embragues','Suspensión']),
('Lubricentro Plaza Puente','Av. Eyzaguirre 350','Puente Alto','+56 2 2852 4455',-33.6110,-70.5750,'Lun-Sáb 08:00-20:00',ARRAY['Cambio de aceite','Filtros','Revisión de niveles']),
('Electro Auto Sur','Av. Camilo Henríquez 3100','Puente Alto','+56 2 2853 7788',-33.5760,-70.5720,'Lun-Vie 09:00-18:00',ARRAY['Electricidad','Baterías','Scanner']),
('Neumáticos Las Vizcachas','Av. Camilo Henríquez 4800','Puente Alto','+56 9 8765 4321',-33.5990,-70.5360,'Lun-Sáb 09:00-19:00 · Dom 10:00-14:00',ARRAY['Neumáticos','Alineación','Balanceo']),
('Diagnóstico Automotriz La Florida','Av. Vicuña Mackenna 7800','La Florida','+56 2 2281 3344',-33.5280,-70.5980,'Lun-Vie 08:30-18:00 · Sáb 09:00-13:00',ARRAY['Scanner','Inyección','Mecánica general']),
('Servicio Integral Tobalaba','Av. Tobalaba 9200','La Florida','+56 2 2282 9911',-33.5410,-70.5640,'Lun-Vie 09:00-18:30',ARRAY['Mantención por pauta','Frenos','Aire acondicionado']),
('Taller Bajos de Mena','Av. Juanita 1200','Puente Alto','+56 9 7654 3210',-33.6270,-70.5890,'Lun-Sáb 09:00-18:00',ARRAY['Mecánica general','Desabolladura','Pintura']),
('Radiadores La Granja','Av. Santa Rosa 9400','La Granja','+56 2 2541 2200',-33.5420,-70.6300,'Lun-Vie 08:30-17:30',ARRAY['Radiadores','Sistema de refrigeración']),
('Centro Automotriz Santiago','Av. Matta 820','Santiago','+56 2 2555 6677',-33.4600,-70.6450,'Lun-Vie 08:30-18:30 · Sáb 09:00-13:00',ARRAY['Mecánica general','Scanner','Frenos','Cambio de aceite']);