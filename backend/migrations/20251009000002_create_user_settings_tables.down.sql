-- Migration: Rollback user settings tables

-- Drop triggers
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
DROP TRIGGER IF EXISTS update_user_keys_updated_at ON user_keys;

-- Drop tables
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS user_keys;
