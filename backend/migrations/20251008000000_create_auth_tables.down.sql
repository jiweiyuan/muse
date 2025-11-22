-- Migration: Rollback auth tables

-- Drop indexes
DROP INDEX IF EXISTS idx_accounts_user_id;
DROP INDEX IF EXISTS idx_sessions_user_id;

-- Drop triggers
DROP TRIGGER IF EXISTS update_verifications_updated_at ON verifications;
DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (in reverse order, respecting foreign keys)
DROP TABLE IF EXISTS verifications;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
