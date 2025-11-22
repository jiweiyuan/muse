-- Rollback: Remove canvas support

-- Drop trigger
DROP TRIGGER IF EXISTS update_canvases_updated_at ON canvases;

-- Drop indexes
DROP INDEX IF EXISTS idx_chats_canvas_id;
DROP INDEX IF EXISTS idx_assets_oss_key;
DROP INDEX IF EXISTS idx_assets_user_id;
DROP INDEX IF EXISTS idx_assets_asset_id;
DROP INDEX IF EXISTS idx_canvases_project_id;

-- Remove canvas_id from chats table
ALTER TABLE chats DROP COLUMN IF EXISTS canvas_id;

-- Drop tables (in reverse order due to foreign keys)
DROP TABLE IF EXISTS assets;
DROP TABLE IF EXISTS canvases;

-- Drop enum
DROP TYPE IF EXISTS oss_provider;
