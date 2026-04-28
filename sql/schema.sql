-- ============================================
-- MozzPCC — Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================

-- =============================================
-- 1. Enable RLS and grant permissions
-- =============================================
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- =============================================
-- 2. Create tables
-- =============================================

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
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

-- Pomodoro sessions table
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  duration INTEGER DEFAULT 25,
  mode TEXT DEFAULT 'work' CHECK (mode IN ('work', 'break')),
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 3. Enable Row Level Security on each table
-- =============================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;

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
-- 6. RLS Policies — Pomodoro Sessions
-- =============================================
DROP POLICY IF EXISTS "Users can view own pomodoro_sessions" ON pomodoro_sessions;
CREATE POLICY "Users can view own pomodoro_sessions" ON pomodoro_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own pomodoro_sessions" ON pomodoro_sessions;
CREATE POLICY "Users can insert own pomodoro_sessions" ON pomodoro_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pomodoro_sessions" ON pomodoro_sessions;
CREATE POLICY "Users can update own pomodoro_sessions" ON pomodoro_sessions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own pomodoro_sessions" ON pomodoro_sessions;
CREATE POLICY "Users can delete own pomodoro_sessions" ON pomodoro_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 7. Indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_id ON pomodoro_sessions(user_id);

-- =============================================
-- 8. Dock Groups table (customizable dock groups)
-- =============================================
CREATE TABLE IF NOT EXISTS user_dock_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'fa-solid fa-folder',
  "order" INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 9. Dock Links table (links within dock groups)
-- =============================================
CREATE TABLE IF NOT EXISTS user_dock_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES user_dock_groups(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'fa-solid fa-link',
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 10. Enable RLS on dock tables
-- =============================================
ALTER TABLE user_dock_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_dock_links ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 11. RLS Policies — Dock Groups
-- =============================================
DROP POLICY IF EXISTS "Users can view own dock_groups" ON user_dock_groups;
CREATE POLICY "Users can view own dock_groups" ON user_dock_groups
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own dock_groups" ON user_dock_groups;
CREATE POLICY "Users can insert own dock_groups" ON user_dock_groups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own dock_groups" ON user_dock_groups;
CREATE POLICY "Users can update own dock_groups" ON user_dock_groups
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own dock_groups" ON user_dock_groups;
CREATE POLICY "Users can delete own dock_groups" ON user_dock_groups
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 12. RLS Policies — Dock Links
-- =============================================
DROP POLICY IF EXISTS "Users can view own dock_links" ON user_dock_links;
CREATE POLICY "Users can view own dock_links" ON user_dock_links
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own dock_links" ON user_dock_links;
CREATE POLICY "Users can insert own dock_links" ON user_dock_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own dock_links" ON user_dock_links;
CREATE POLICY "Users can update own dock_links" ON user_dock_links
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own dock_links" ON user_dock_links;
CREATE POLICY "Users can delete own dock_links" ON user_dock_links
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 13. Indexes for dock tables
-- =============================================
CREATE INDEX IF NOT EXISTS idx_dock_groups_user_id ON user_dock_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_dock_links_user_id ON user_dock_links(user_id);
CREATE INDEX IF NOT EXISTS idx_dock_links_group_id ON user_dock_links(group_id);

-- =============================================
-- 14. User Preferences table (themes, settings)
-- =============================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  theme TEXT DEFAULT 'cyber' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- =============================================
-- 15. Enable RLS on user_preferences
-- =============================================
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 16. RLS Policies — User Preferences
-- =============================================
DROP POLICY IF EXISTS "Users manage own preferences" ON user_preferences;
CREATE POLICY "Users manage own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 17. Index for user_preferences
-- =============================================
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
