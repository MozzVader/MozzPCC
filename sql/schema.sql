-- ============================================
-- MozzPCC — Supabase Database Schema (COMPLETO)
-- Run this in the Supabase SQL Editor
-- ============================================
-- Este archivo contiene el schema completo incluyendo todas las
-- tablas y columnas agregadas a lo largo del desarrollo.
-- Si ya tenes una instalacion existente, solo necesitas ejecutar
-- los archivos de migracion individual en la carpeta sql/.
-- ============================================

-- =============================================
-- 1. Enable RLS and grant permissions
-- =============================================
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- Explicit grants for all tables (Supabase requirement from Oct 2025)
GRANT ALL ON TABLE tasks TO authenticated, service_role;
GRANT ALL ON TABLE notes TO authenticated, service_role;
GRANT ALL ON TABLE user_preferences TO authenticated, service_role;
GRANT ALL ON TABLE user_quick_links TO authenticated, service_role;
GRANT ALL ON TABLE finance_categories TO authenticated, service_role;
GRANT ALL ON TABLE finance_transactions TO authenticated, service_role;
GRANT ALL ON TABLE read_later_items TO authenticated, service_role;
GRANT ALL ON TABLE tv_shows TO authenticated, service_role;
GRANT ALL ON TABLE user_steam_settings TO authenticated, service_role;

-- =============================================
-- 2. Create tables
-- =============================================

-- Tasks table (con status, priority y sort_order)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'en_progreso', 'hecha')),
  priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('alta', 'media', 'baja')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT DEFAULT '',
  content TEXT DEFAULT '',
  color TEXT DEFAULT 'yellow',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Read Later table (con tag_color)
CREATE TABLE IF NOT EXISTS read_later_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  tag_color TEXT,
  icon TEXT DEFAULT 'fa-solid fa-bookmark',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  order_index INTEGER DEFAULT 0
);

-- TV Shows table
CREATE TABLE IF NOT EXISTS tv_shows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tvmaze_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  poster_url TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. User Preferences table (todos los settings)
-- =============================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  theme TEXT DEFAULT 'cyber' NOT NULL,
  theme_skin TEXT DEFAULT 'default',
  city TEXT DEFAULT '',
  github_username TEXT DEFAULT '',
  currency TEXT DEFAULT '$',
  autolock_minutes INTEGER DEFAULT 20,
  wallpaper_url TEXT,
  wallpaper_color TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- =============================================
-- 4. Quick Links table
-- =============================================
CREATE TABLE IF NOT EXISTS user_quick_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  icon_type TEXT NOT NULL DEFAULT 'fontawesome' CHECK (icon_type IN ('fontawesome', 'image', 'favicon')),
  icon_value TEXT NOT NULL DEFAULT 'fa-solid fa-globe',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 5. Finance tables
-- =============================================
CREATE TABLE IF NOT EXISTS finance_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'fa-solid fa-tag',
  color TEXT NOT NULL DEFAULT '#6b7280',
  type TEXT NOT NULL DEFAULT 'gasto' CHECK (type IN ('ingreso', 'gasto')),
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL DEFAULT 'gasto' CHECK (type IN ('ingreso', 'gasto')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  category_id UUID REFERENCES finance_categories(id) ON DELETE SET NULL,
  description TEXT DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 6. Steam settings table
-- =============================================
CREATE TABLE IF NOT EXISTS user_steam_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  steam_id TEXT NOT NULL,
  vanity_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(steam_id)
);

-- =============================================
-- 7. Enable Row Level Security on ALL tables
-- =============================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE read_later_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tv_shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quick_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_steam_settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 8. RLS Policies — Tasks
-- =============================================
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;
CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 9. RLS Policies — Notes
-- =============================================
DROP POLICY IF EXISTS "Users can view own notes" ON notes;
CREATE POLICY "Users can view own notes" ON notes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notes" ON notes;
CREATE POLICY "Users can insert own notes" ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notes" ON notes;
CREATE POLICY "Users can update own notes" ON notes
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notes" ON notes;
CREATE POLICY "Users can delete own notes" ON notes
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 10. RLS Policies — Read Later
-- =============================================
DROP POLICY IF EXISTS "Users can view own read later items" ON read_later_items;
CREATE POLICY "Users can view own read later items" ON read_later_items
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own read later items" ON read_later_items;
CREATE POLICY "Users can insert own read later items" ON read_later_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own read later items" ON read_later_items;
CREATE POLICY "Users can update own read later items" ON read_later_items
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own read later items" ON read_later_items;
CREATE POLICY "Users can delete own read later items" ON read_later_items
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 11. RLS Policies — TV Shows
-- =============================================
DROP POLICY IF EXISTS "Users can view own tv_shows" ON tv_shows;
CREATE POLICY "Users can view own tv_shows" ON tv_shows
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tv_shows" ON tv_shows;
CREATE POLICY "Users can insert own tv_shows" ON tv_shows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tv_shows" ON tv_shows;
CREATE POLICY "Users can delete own tv_shows" ON tv_shows
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 12. RLS Policies — User Preferences
-- =============================================
DROP POLICY IF EXISTS "Users manage own preferences" ON user_preferences;
CREATE POLICY "Users manage own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 13. RLS Policies — Quick Links
-- =============================================
DROP POLICY IF EXISTS "Users manage own quick links" ON user_quick_links;
CREATE POLICY "Users manage own quick links" ON user_quick_links
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 14. RLS Policies — Finance
-- =============================================
DROP POLICY IF EXISTS "Users manage own finance_categories" ON finance_categories;
CREATE POLICY "Users manage own finance_categories" ON finance_categories
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own finance_transactions" ON finance_transactions;
CREATE POLICY "Users manage own finance_transactions" ON finance_transactions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 15. RLS Policies — Steam
-- =============================================
DROP POLICY IF EXISTS "Users can view own steam settings" ON user_steam_settings;
CREATE POLICY "Users can view own steam settings" ON user_steam_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own steam settings" ON user_steam_settings;
CREATE POLICY "Users can insert own steam settings" ON user_steam_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own steam settings" ON user_steam_settings;
CREATE POLICY "Users can update own steam settings" ON user_steam_settings
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own steam settings" ON user_steam_settings;
CREATE POLICY "Users can delete own steam settings" ON user_steam_settings
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 16. Indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(sort_order);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_read_later_user_id ON read_later_items(user_id);
CREATE INDEX IF NOT EXISTS idx_tv_shows_user_id ON tv_shows(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_links_user_id ON user_quick_links(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_categories_user_id ON finance_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_user_id ON finance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_category_id ON finance_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_date ON finance_transactions(date DESC);
