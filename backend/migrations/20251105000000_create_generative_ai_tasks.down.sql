-- Rollback: Drop generative AI tasks queue system

-- Drop indexes first
DROP INDEX IF EXISTS idx_processing_claimed;
DROP INDEX IF EXISTS idx_task_type_status;
DROP INDEX IF EXISTS idx_project_status;
DROP INDEX IF EXISTS idx_user_project;
DROP INDEX IF EXISTS idx_status_created;

-- Drop table
DROP TABLE IF EXISTS generative_ai_tasks;

-- Drop enums
DROP TYPE IF EXISTS task_status_enum;
DROP TYPE IF EXISTS task_type_enum;
