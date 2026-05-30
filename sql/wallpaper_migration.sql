-- ============================================
-- MozzPCC — Migration: wallpaper columns
-- ============================================
-- Agrega columnas para persistir wallpaper personalizado
--
-- Ejecutar en Supabase SQL Editor:
-- ============================================

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS wallpaper_url TEXT;

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS wallpaper_color TEXT;

COMMENT ON COLUMN user_preferences.wallpaper_url IS 'URL de imagen para fondo personalizado del dashboard';
COMMENT ON COLUMN user_preferences.wallpaper_color IS 'Color hexadecimal para fondo solido del dashboard';
