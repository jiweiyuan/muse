-- Migration: Create user settings tables
-- This migration creates user-related settings: user_keys, user_preferences

-- User keys table (composite primary key)
CREATE TABLE IF NOT EXISTS user_keys (
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  iv TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, provider)
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,
  layout TEXT DEFAULT 'fullscreen' NOT NULL,
  prompt_suggestions BOOLEAN DEFAULT true NOT NULL,
  show_tool_invocations BOOLEAN DEFAULT true NOT NULL,
  show_conversation_previews BOOLEAN DEFAULT true NOT NULL,
  multi_model_enabled BOOLEAN DEFAULT false NOT NULL,
  hidden_models JSONB DEFAULT '[]'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create triggers for updated_at
CREATE TRIGGER update_user_keys_updated_at BEFORE UPDATE ON user_keys
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
