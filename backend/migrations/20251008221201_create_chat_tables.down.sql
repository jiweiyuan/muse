-- Migration: Rollback chat tables

-- Drop indexes
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_chat_id;
DROP INDEX IF EXISTS idx_chats_active_stream_id;
DROP INDEX IF EXISTS idx_chats_project_id;
DROP INDEX IF EXISTS idx_chats_user_id;
DROP INDEX IF EXISTS idx_projects_last_edit_at;
DROP INDEX IF EXISTS idx_projects_user_id;

-- Drop triggers
DROP TRIGGER IF EXISTS update_chats_updated_at ON chats;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;

-- Drop tables (in reverse order)
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS chats;
DROP TABLE IF EXISTS projects;

-- Drop enum
DROP TYPE IF EXISTS message_role;
