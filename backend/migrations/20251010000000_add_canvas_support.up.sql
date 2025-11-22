-- Migration: Add canvas support
-- This migration adds canvas functionality to the application

-- Create canvases table (merged with snapshots)
-- Canvases have a 1:1 relationship with projects
CREATE TABLE IF NOT EXISTS canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create OSS provider enum for object storage abstraction
CREATE TYPE oss_provider AS ENUM ('cloudflare');

-- Create assets table (stores metadata for OSS-stored assets)
-- General-purpose asset storage - supports canvases, temp files, and other use cases
-- Binary data is stored in external object storage (R2, S3, etc), not in database
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Object storage metadata (provider-agnostic)
  oss_provider oss_provider NOT NULL DEFAULT 'cloudflare',
  oss_bucket TEXT NOT NULL,
  oss_key TEXT NOT NULL,
  oss_etag TEXT,

  -- File metadata
  content_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  original_filename TEXT,

  -- Timestamps
  uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add canvas_id to chats table (removed UNIQUE constraint - multiple chats can share a canvas)
ALTER TABLE chats ADD COLUMN canvas_id UUID REFERENCES canvases(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX idx_canvases_project_id ON canvases(project_id);
CREATE INDEX idx_assets_asset_id ON assets(asset_id);
CREATE INDEX idx_assets_user_id ON assets(user_id);
CREATE INDEX idx_assets_oss_key ON assets(oss_key);
CREATE INDEX idx_chats_canvas_id ON chats(canvas_id);

-- Create trigger for updated_at on canvases table
CREATE TRIGGER update_canvases_updated_at BEFORE UPDATE ON canvases
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
