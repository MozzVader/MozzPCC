-- Migration: Add status and sort_order to tasks table
-- Run this in Supabase SQL Editor

-- Add status column (default 'pending' for existing incomplete, 'completed' for existing completed)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Migrate existing data
UPDATE tasks SET status = 'completed' WHERE completed = true;
UPDATE tasks SET status = 'pending' WHERE completed = false OR completed IS NULL;

-- Drop old column
ALTER TABLE tasks DROP COLUMN IF EXISTS completed;

-- Add index
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(sort_order);
