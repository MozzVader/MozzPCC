-- =============================================
-- Read Later Widget — Icon Migration
-- Agrega columna 'icon' para personalizar el icono de cada link
-- Ejecutar en Supabase SQL Editor
-- =============================================

ALTER TABLE read_later_items ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'fa-solid fa-bookmark';
