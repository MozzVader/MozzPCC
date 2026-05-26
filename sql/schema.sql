-- ============================================
-- MozzPCC — Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================

-- =============================================
-- 1. Enable RLS and grant permissions
-- =============================================
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- Explicit grants for existing tables (Supabase requirement from Oct 2025)
GRANT ALL ON TABLE tasks TO authenticated, service_role;
GRANT ALL ON TABLE notes TO authenticated, service_role;
GRANT ALL ON TABLE user_preferences TO authenticated, service_role;
GRANT ALL ON TABLE user_quick_links TO authenticated, service_role;
GRANT ALL ON TABLE finance_categories TO authenticated, service_role;
GRANT ALL ON TABLE finance_transactions TO authenticated, service_role;

-- =============================================
-- 2. Create tables
-- =============================================

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
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

-- =============================================
-- 3. Enable Row Level Security on each table
-- =============================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. RLS Policies — Tasks
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
-- 5. RLS Policies — Notes
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
-- 6. Indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);

-- =============================================
-- 7. User Preferences table (themes, settings)
-- =============================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  theme TEXT DEFAULT 'cyber' NOT NULL,
  city TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Para instalaciones existentes que no tienen la columna city
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';

-- =============================================
-- 8. Enable RLS on user_preferences
-- =============================================
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 9. RLS Policies — User Preferences
-- =============================================
DROP POLICY IF EXISTS "Users manage own preferences" ON user_preferences;
CREATE POLICY "Users manage own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 10. Index for user_preferences
-- =============================================
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- =============================================
-- 11. Quick Links table (accesos rápidos del usuario)
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
-- 12. Enable RLS on user_quick_links
-- =============================================
ALTER TABLE user_quick_links ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 13. RLS Policies — Quick Links
-- =============================================
DROP POLICY IF EXISTS "Users manage own quick links" ON user_quick_links;
CREATE POLICY "Users manage own quick links" ON user_quick_links
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 14. Index for user_quick_links
-- =============================================
CREATE INDEX IF NOT EXISTS idx_quick_links_user_id ON user_quick_links(user_id);

-- =============================================
-- 15. Finance Categories table
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

-- =============================================
-- 16. Finance Transactions table
-- =============================================
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
-- 17. Enable RLS on finance tables
-- =============================================
ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 18. RLS Policies — Finance Categories
-- =============================================
DROP POLICY IF EXISTS "Users manage own finance_categories" ON finance_categories;
CREATE POLICY "Users manage own finance_categories" ON finance_categories
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 19. RLS Policies — Finance Transactions
-- =============================================
DROP POLICY IF EXISTS "Users manage own finance_transactions" ON finance_transactions;
CREATE POLICY "Users manage own finance_transactions" ON finance_transactions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 20. Indexes for finance tables
-- =============================================
CREATE INDEX IF NOT EXISTS idx_finance_categories_user_id ON finance_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_user_id ON finance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_category_id ON finance_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_date ON finance_transactions(date DESC);
