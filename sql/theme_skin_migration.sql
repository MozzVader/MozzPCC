-- ============================================
-- MozzPCC — Migration: theme_skin column
-- ============================================
-- Agrega la columna theme_skin a user_preferences
-- para persistir el tema visual elegido (default, notion, macos, etc.)
--
-- Ejecutar en Supabase SQL Editor:
-- ============================================

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS theme_skin TEXT DEFAULT 'default';

-- Comentario de columna (PostgreSQL)
COMMENT ON COLUMN user_preferences.theme_skin IS 'Tema visual del dashboard: default, notion, macos, windows, retro';
