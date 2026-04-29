-- =============================================
-- Read Later — Tag Color Migration
-- Ejecutar en Supabase SQL Editor
-- =============================================

ALTER TABLE read_later_items ADD COLUMN IF NOT EXISTS tag_color TEXT;
