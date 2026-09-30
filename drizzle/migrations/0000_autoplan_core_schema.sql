-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT,
  telefono TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'nombre', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TABLE public.vehiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patente TEXT NOT NULL,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  anio INTEGER NOT NULL CHECK (anio BETWEEN 1900 AND 2100),
  color TEXT,
  kilometraje INTEGER NOT NULL DEFAULT 0 CHECK (kilometraje >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX vehiculos_user_idx ON public.vehiculos(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehiculos TO authenticated;
GRANT ALL ON public.vehiculos TO service_role;
ALTER TABLE public.vehiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehiculos_select_own" ON public.vehiculos FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "vehiculos_insert_own" ON public.vehiculos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "vehiculos_update_own" ON public.vehiculos FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "vehiculos_delete_own" ON public.vehiculos FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER vehiculos_updated_at BEFORE UPDATE ON public.vehiculos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.mantenciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descripcion TEXT,
  fecha DATE NOT NULL,
  kilometraje INTEGER NOT NULL CHECK (kilometraje >= 0),
  costo INTEGER CHECK (costo >= 0),
  taller TEXT,
  proxima_fecha DATE,
  proximo_km INTEGER CHECK (proximo_km >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX mantenciones_vehiculo_idx ON public.mantenciones(vehiculo_id);
CREATE INDEX mantenciones_user_idx ON public.mantenciones(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mantenciones TO authenticated;
GRANT ALL ON public.mantenciones TO service_role;
ALTER TABLE public.mantenciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mantenciones_select_own" ON public.mantenciones FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "mantenciones_insert_own" ON public.mantenciones FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "mantenciones_update_own" ON public.mantenciones FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "mantenciones_delete_own" ON public.mantenciones FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER mantenciones_updated_at BEFORE UPDATE ON public.mantenciones FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehiculo_id UUID REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  tamano_bytes INTEGER NOT NULL CHECK (tamano_bytes > 0),
  fecha_vencimiento DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX documentos_user_idx ON public.documentos(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos TO authenticated;
GRANT ALL ON public.documentos TO service_role;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documentos_select_own" ON public.documentos FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "documentos_insert_own" ON public.documentos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "documentos_update_own" ON public.documentos FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "documentos_delete_own" ON public.documentos FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id TEXT,
  detalle JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX auditoria_user_idx ON public.auditoria(user_id);
GRANT SELECT, INSERT ON public.auditoria TO authenticated;
GRANT ALL ON public.auditoria TO service_role;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auditoria_select_own" ON public.auditoria FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "auditoria_insert_own" ON public.auditoria FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "docs_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "docs_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "docs_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "docs_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);