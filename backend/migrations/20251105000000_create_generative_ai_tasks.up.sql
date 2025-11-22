-- Migration: Create generative AI tasks queue system
-- Created: 2025-11-05
-- Purpose: Async task queue for image generation, upscaling, and background removal

-- Task type enum for different AI operations
CREATE TYPE task_type_enum AS ENUM (
  'generate_image',      -- Generate image from text prompt
  'image_upscale',       -- Upscale existing image
  'image_remove_background'    -- Remove background from image
);

-- Task status enum
CREATE TYPE task_status_enum AS ENUM (
  'pending',      -- Waiting in queue
  'processing',   -- Worker is processing
  'completed',    -- Successfully completed
  'failed'        -- Failed after retries
);

-- Generative AI tasks table
CREATE TABLE generative_ai_tasks (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Task type
  task_type task_type_enum NOT NULL,

  -- User and project context
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Optional shape context (for canvas updates)
  -- Note: canvas_id is NOT stored - derived from project_id (1:1 relationship)
  shape_id TEXT, -- Optional: TLDraw shape ID to update (null if no canvas update)

  -- Flexible body for parameters and results
  -- Structure varies by task_type:
  -- For 'generate_image': { prompt, aspectRatio, outputFormat }
  -- For 'image_upscale': { sourceAssetId, factor }
  -- For 'image_remove_background': { sourceAssetId }
  body JSONB NOT NULL DEFAULT '{}',

  -- Task state
  status task_status_enum NOT NULL DEFAULT 'pending',

  -- Results (populated on completion)
  result JSONB,
    -- For successful completion: { assetId, assetUrl, metadata }
    -- For failure: { errorMessage, errorCode, errorDetails }

  -- Retry mechanism
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Worker tracking
  worker_id TEXT, -- Identifies which worker is processing
  claimed_at TIMESTAMP WITH TIME ZONE, -- When worker claimed task

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE, -- When processing started
  completed_at TIMESTAMP WITH TIME ZONE, -- When finished (success or fail)
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
-- Most frequent query: Find pending tasks
CREATE INDEX idx_status_created ON generative_ai_tasks(status, created_at);

-- User's tasks for a project
CREATE INDEX idx_user_project ON generative_ai_tasks(user_id, project_id);

-- Project task summary
CREATE INDEX idx_project_status ON generative_ai_tasks(project_id, status);

-- Task type filtering
CREATE INDEX idx_task_type_status ON generative_ai_tasks(task_type, status);

-- Cleanup: Find stale processing tasks
CREATE INDEX idx_processing_claimed ON generative_ai_tasks(status, claimed_at) WHERE status = 'processing';
