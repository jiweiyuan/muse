-- Migration: Create chat tables
-- This migration creates chat-related tables: projects, chats, messages

-- Create enum for message roles
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system', 'tool');

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT DEFAULT 'Untitled Project' NOT NULL,
  cover_url TEXT,
  last_edit_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  active_stream_id VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL,
  role message_role NOT NULL,
  content TEXT NOT NULL,
  parts JSONB,
  experimental_attachments JSONB,
  message_group_id VARCHAR(128),
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create triggers for updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_last_edit_at ON projects(last_edit_at DESC);
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_project_id ON chats(project_id);
CREATE INDEX idx_chats_active_stream_id ON chats(active_stream_id);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
