-- =============================================
-- Read Later Widget — Migration
-- Ejecutar en Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS read_later_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  order_index INTEGER DEFAULT 0
);

-- RLS
ALTER TABLE read_later_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own read later items"
  ON read_later_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own read later items"
  ON read_later_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own read later items"
  ON read_later_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own read later items"
  ON read_later_items FOR DELETE
  USING (auth.uid() = user_id);
