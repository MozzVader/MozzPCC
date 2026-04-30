-- =============================================
-- Steam Stats Widget — Migration
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Tabla de configuración Steam por usuario
CREATE TABLE IF NOT EXISTS user_steam_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  steam_id TEXT NOT NULL,
  vanity_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(steam_id)
);

-- RLS
ALTER TABLE user_steam_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own steam settings"
  ON user_steam_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own steam settings"
  ON user_steam_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own steam settings"
  ON user_steam_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own steam settings"
  ON user_steam_settings FOR DELETE
  USING (auth.uid() = user_id);
