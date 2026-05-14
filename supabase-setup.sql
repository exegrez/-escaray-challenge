-- =============================================
-- ESCARAY WINTER CHALLENGE - Setup SQL
-- Ejecutar en Supabase → SQL Editor
-- =============================================

-- 1. Tabla de perfiles (extiende auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nickname TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Sesiones de entrenamiento
CREATE TABLE trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  photo_url TEXT NOT NULL,
  notes TEXT,
  is_monday_escaray BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Reportes diarios
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  tobacco_count INT DEFAULT 0,
  had_spirits BOOLEAN DEFAULT FALSE,
  wake_time TIME,
  woke_at_730 BOOLEAN DEFAULT FALSE,
  had_paja BOOLEAN DEFAULT FALSE,
  paja_time TIME,
  used_green_card BOOLEAN DEFAULT FALSE,
  green_card_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- =============================================
-- SEGURIDAD (Row Level Security)
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- Profiles: todos pueden ver, cada uno edita el suyo
CREATE POLICY "Ver perfiles" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Crear perfil propio" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Editar perfil propio" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Trainings: todos pueden ver, cada uno crea los suyos
CREATE POLICY "Ver entrenamientos" ON trainings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Crear entrenamiento" ON trainings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Editar entrenamiento" ON trainings FOR UPDATE USING (auth.uid() = user_id);

-- Daily reports: todos pueden ver, cada uno crea los suyos
CREATE POLICY "Ver reportes" ON daily_reports FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Crear reporte" ON daily_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Editar reporte" ON daily_reports FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- STORAGE (fotos de entrenamiento)
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('training-photos', 'training-photos', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Ver fotos" ON storage.objects
  FOR SELECT USING (bucket_id = 'training-photos');

CREATE POLICY "Subir fotos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'training-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Editar fotos propias" ON storage.objects
  FOR UPDATE USING (bucket_id = 'training-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- TRIGGER: crear perfil automático al registrarse
-- =============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
