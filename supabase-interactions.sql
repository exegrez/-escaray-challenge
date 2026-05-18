-- =============================================
-- ESCARAY WINTER CHALLENGE - Interacciones
-- Ejecutar en Supabase → SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  training_id UUID REFERENCES trainings(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  training_id UUID REFERENCES trainings(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, training_id, emoji)
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver comentarios" ON comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Crear comentario" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Borrar comentario propio" ON comments FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Ver reacciones" ON reactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Crear reacción" ON reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Borrar reacción propia" ON reactions FOR DELETE USING (auth.uid() = user_id);
