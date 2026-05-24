-- Add github_username column to user_preferences
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS github_username TEXT DEFAULT '';
