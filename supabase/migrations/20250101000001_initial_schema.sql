-- ============================================================================
-- Initial Database Schema Migration
-- ============================================================================
-- Created: 2025-01-01
-- Purpose: Document the complete structure of tasks and user_preferences tables
--          with all constraints and indexes for the Todo App.
-- 
-- References:
-- - src/App.tsx (lines 39, 91, 160, 201-202, 237-238)
-- - src/components/Preferences.tsx (lines 27, 93, 116, 141)
-- ============================================================================

-- ============================================================================
-- TASKS TABLE
-- ============================================================================
-- Stores user tasks with soft-delete support and late task tracking.
-- Each task belongs to a single user and tracks creation, completion, and deletion times.

CREATE TABLE IF NOT EXISTS tasks (
  -- Primary key: UUID automatically generated for each task
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to auth.users: ensures every task belongs to a valid user
  -- ON DELETE CASCADE: when a user is deleted, all their tasks are deleted
  -- Referenced in src/App.tsx line 39, 160, 201-202, 237-238
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Task name: must be non-empty and reasonable length
  -- CHECK constraint prevents empty strings and excessively long names
  name TEXT NOT NULL CHECK (length(trim(name)) > 0 AND length(name) <= 500),
  
  -- Timestamp when task was created
  -- Used to calculate if task is late (>24 hours old)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Timestamp when task was completed (nullable for incomplete tasks)
  -- Used in src/App.tsx line 91 to filter completed tasks
  completed_at TIMESTAMPTZ,
  
  -- Timestamp when task was soft-deleted (nullable for active tasks)
  -- Used in src/App.tsx line 160 for cleanup operations
  deleted_at TIMESTAMPTZ,
  
  -- Boolean flag indicating if task is late (>24 hours old and incomplete)
  -- Set by mark_tasks_late() RPC function
  is_late BOOLEAN DEFAULT false,
  
  -- ============================================================================
  -- CONSTRAINTS
  -- ============================================================================
  
  -- Ensure completed_at is not before created_at (prevents time paradoxes)
  CONSTRAINT completed_after_created CHECK (completed_at IS NULL OR completed_at >= created_at),
  
  -- Ensure deleted_at is not before created_at (prevents time paradoxes)
  CONSTRAINT deleted_after_created CHECK (deleted_at IS NULL OR deleted_at >= created_at),
  
  -- Ensure completed tasks are also soft-deleted
  -- This enforces the app's business logic: completing a task soft-deletes it
  -- Referenced in src/App.tsx line 91-96
  CONSTRAINT completed_tasks_are_deleted CHECK (completed_at IS NULL OR deleted_at IS NOT NULL)
  
  -- Note: Uniqueness for active task names is enforced by partial unique index below
  -- (not by a table constraint, to allow duplicate names for soft-deleted tasks)
);

-- Create partial unique index for active tasks
-- This allows duplicate names only if at least one is soft-deleted
-- Uniqueness is enforced solely by this index (no table constraint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_unique_active_name ON tasks(user_id, name) 
  WHERE deleted_at IS NULL;

-- ============================================================================
-- TASKS TABLE INDEXES
-- ============================================================================

-- Index for user-specific queries
-- Used in src/App.tsx line 36-40 (loadTasks function)
-- Speeds up: SELECT * FROM tasks WHERE user_id = $1
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

-- Partial index for active tasks queries (most common query pattern)
-- Used throughout src/App.tsx for filtering incomplete, non-deleted tasks
-- Speeds up: SELECT * FROM tasks WHERE user_id = $1 AND completed_at IS NULL AND deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_tasks_user_active ON tasks(user_id) 
  WHERE completed_at IS NULL AND deleted_at IS NULL;

-- Index for cleanup operations
-- Used by cleanup_tasks() RPC function (src/App.tsx line 66)
-- Speeds up: DELETE FROM tasks WHERE deleted_at < now() - interval '48 hours'
CREATE INDEX IF NOT EXISTS idx_tasks_cleanup ON tasks(deleted_at) 
  WHERE deleted_at IS NOT NULL;

-- Index for late task marking
-- Used by mark_tasks_late() RPC function (src/App.tsx line 69)
-- Speeds up: UPDATE tasks SET is_late = true WHERE created_at < now() - interval '24 hours' AND ...
CREATE INDEX IF NOT EXISTS idx_tasks_late ON tasks(created_at, is_late) 
  WHERE completed_at IS NULL AND deleted_at IS NULL;

-- ============================================================================
-- USER_PREFERENCES TABLE
-- ============================================================================
-- Stores user-specific UI preferences (theme and font).
-- Each user has at most one preferences row (enforced by PRIMARY KEY on user_id).

CREATE TABLE IF NOT EXISTS user_preferences (
  -- Primary key: user_id ensures one preference row per user
  -- Foreign key to auth.users with CASCADE delete
  -- Referenced in src/components/Preferences.tsx line 27, 93, 116, 141
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Theme preference: must be 'light' or 'dark'
  -- Used in src/components/Preferences.tsx line 37-38
  theme TEXT NOT NULL CHECK (theme IN ('light', 'dark')) DEFAULT 'dark',
  
  -- Font preference: must be 'system', 'mono', or 'serif'
  -- Used in src/components/Preferences.tsx line 40-42
  font TEXT NOT NULL CHECK (font IN ('system', 'mono', 'serif')) DEFAULT 'system',
  
  -- Timestamp when preferences were created
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Timestamp when preferences were last updated
  -- Used in src/components/Preferences.tsx line 105, 130 for upsert operations
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- ============================================================================
  -- CONSTRAINTS
  -- ============================================================================
  
  -- Ensure updated_at is not before created_at
  CONSTRAINT updated_after_created CHECK (updated_at >= created_at)
);

-- ============================================================================
-- USER_PREFERENCES TABLE INDEXES
-- ============================================================================

-- No additional indexes needed beyond the primary key on user_id
-- All queries are single-row lookups by user_id (primary key provides automatic index)
-- Referenced in src/components/Preferences.tsx line 23-27 (single row SELECT)

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE tasks IS 'User tasks with soft-delete support and late task tracking';
COMMENT ON COLUMN tasks.user_id IS 'Foreign key to auth.users - ensures task ownership';
COMMENT ON COLUMN tasks.name IS 'Task name (1-500 characters, non-empty after trim)';
COMMENT ON COLUMN tasks.created_at IS 'Task creation timestamp - used to calculate if task is late';
COMMENT ON COLUMN tasks.completed_at IS 'Task completion timestamp - NULL for incomplete tasks';
COMMENT ON COLUMN tasks.deleted_at IS 'Soft-delete timestamp - NULL for active tasks';
COMMENT ON COLUMN tasks.is_late IS 'Flag indicating task is >24 hours old and incomplete';

COMMENT ON TABLE user_preferences IS 'User UI preferences (theme and font) - one row per user';
COMMENT ON COLUMN user_preferences.user_id IS 'Primary key and foreign key to auth.users';
COMMENT ON COLUMN user_preferences.theme IS 'UI theme: light or dark';
COMMENT ON COLUMN user_preferences.font IS 'UI font family: system, mono, or serif';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Apply 20250101000002_enable_rls.sql to enable Row Level Security
-- 2. Apply 20250101000003_rpc_functions.sql to create RPC functions
-- ============================================================================
