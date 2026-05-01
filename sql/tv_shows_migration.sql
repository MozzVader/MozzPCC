-- =============================================
-- TV Shows — Migration
-- Ejecutar en Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS tv_shows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tvmaze_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  poster_url TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE tv_shows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tv_shows"
  ON tv_shows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tv_shows"
  ON tv_shows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tv_shows"
  ON tv_shows FOR DELETE
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_tv_shows_user_id ON tv_shows(user_id);
