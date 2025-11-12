-- ============================================================================
-- Row Level Security (RLS) Policies Migration
-- ============================================================================
-- Created: 2025-01-01
-- Purpose: Enable Row Level Security on all tables and define comprehensive
--          security policies to enforce user data isolation at the database level.
-- 
-- References:
-- - src/App.tsx (lines 39, 91, 160, 201-202, 237-238)
-- - src/components/Preferences.tsx (lines 27, 93, 116, 141)
-- 
-- Security Model:
-- - All policies use auth.uid() which returns the authenticated user's ID from JWT
-- - Policies are enforced at the database level, even if client-side code is compromised
-- - The anon key can only access data allowed by these policies
-- - Service role key bypasses RLS (should never be exposed to client)
-- ============================================================================

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on tasks table
-- This ensures no data can be accessed without passing through RLS policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_preferences table
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TASKS TABLE RLS POLICIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SELECT Policy: Users can view their own tasks
-- ----------------------------------------------------------------------------
-- Name: tasks_select_own
-- Purpose: Allow users to read only their own tasks
-- Used by: All SELECT queries in src/App.tsx (lines 39, 91, 160, 201-202, 237-238)

CREATE POLICY tasks_select_own ON tasks
  FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON POLICY tasks_select_own ON tasks IS 
  'Users can only SELECT their own tasks. Enforced by auth.uid() = user_id check.';

-- ----------------------------------------------------------------------------
-- INSERT Policy: Users can create their own tasks
-- ----------------------------------------------------------------------------
-- Name: tasks_insert_own
-- Purpose: Ensure users can only insert tasks with their own user_id
-- Used by: INSERT operations in src/App.tsx (line 237-238)
-- Additional Check: New tasks must be active (not completed or deleted)

CREATE POLICY tasks_insert_own ON tasks
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND completed_at IS NULL 
    AND deleted_at IS NULL
  );

COMMENT ON POLICY tasks_insert_own ON tasks IS 
  'Users can only INSERT tasks with their own user_id. New tasks must be active (not completed or deleted).';

-- ----------------------------------------------------------------------------
-- UPDATE Policy: Users can update their own tasks
-- ----------------------------------------------------------------------------
-- Name: tasks_update_own
-- Purpose: Allow users to update their own tasks, prevent changing user_id
-- Used by: UPDATE operations in src/App.tsx (lines 91, 160, 201-202)
-- USING clause: Determines which rows can be selected for update
-- WITH CHECK clause: Validates the updated row still belongs to the user

CREATE POLICY tasks_update_own ON tasks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY tasks_update_own ON tasks IS 
  'Users can only UPDATE their own tasks. Prevents users from changing user_id to another user.';

-- ----------------------------------------------------------------------------
-- DELETE Policy: Users can delete their own tasks
-- ----------------------------------------------------------------------------
-- Name: tasks_delete_own
-- Purpose: Allow users to hard delete their own tasks
-- Note: The app uses soft deletes (setting deleted_at), but this policy allows hard deletes
-- Used by: Potential future hard delete operations (currently app uses soft deletes)

CREATE POLICY tasks_delete_own ON tasks
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON POLICY tasks_delete_own ON tasks IS 
  'Users can only DELETE their own tasks. App uses soft deletes, but this allows hard deletes if needed.';

-- ============================================================================
-- USER_PREFERENCES TABLE RLS POLICIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SELECT Policy: Users can view their own preferences
-- ----------------------------------------------------------------------------
-- Name: preferences_select_own
-- Purpose: Allow users to read only their own preferences
-- Used by: SELECT query in src/components/Preferences.tsx (line 23-27)

CREATE POLICY preferences_select_own ON user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON POLICY preferences_select_own ON user_preferences IS 
  'Users can only SELECT their own preferences. Enforced by auth.uid() = user_id check.';

-- ----------------------------------------------------------------------------
-- INSERT Policy: Users can create their own preferences
-- ----------------------------------------------------------------------------
-- Name: preferences_insert_own
-- Purpose: Ensure users can only insert preferences with their own user_id
-- Used by: UPSERT operations in src/components/Preferences.tsx (lines 100-108, 125-133)

CREATE POLICY preferences_insert_own ON user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY preferences_insert_own ON user_preferences IS 
  'Users can only INSERT preferences with their own user_id.';

-- ----------------------------------------------------------------------------
-- UPDATE Policy: Users can update their own preferences
-- ----------------------------------------------------------------------------
-- Name: preferences_update_own
-- Purpose: Allow users to update their own preferences, prevent changing user_id
-- Used by: UPSERT operations in src/components/Preferences.tsx (lines 100-108, 125-133)

CREATE POLICY preferences_update_own ON user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY preferences_update_own ON user_preferences IS 
  'Users can only UPDATE their own preferences. Prevents users from changing user_id to another user.';

-- ----------------------------------------------------------------------------
-- DELETE Policy: Users can delete their own preferences
-- ----------------------------------------------------------------------------
-- Name: preferences_delete_own
-- Purpose: Allow users to delete their own preferences
-- Note: Currently not used in the app, but provided for completeness

CREATE POLICY preferences_delete_own ON user_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON POLICY preferences_delete_own ON user_preferences IS 
  'Users can only DELETE their own preferences. Currently not used in app.';

-- ============================================================================
-- TESTING RLS POLICIES
-- ============================================================================
-- The following queries can be used to test RLS policies in the Supabase SQL Editor
-- 
-- Test 1: Verify User A can only see their own tasks
-- SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
-- SELECT * FROM tasks; -- Should only return User A's tasks
-- 
-- Test 2: Verify User B can only see their own tasks
-- SET request.jwt.claims TO '{"sub": "user-b-uuid"}';
-- SELECT * FROM tasks; -- Should only return User B's tasks
-- 
-- Test 3: Verify User A cannot insert tasks with User B's user_id
-- SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
-- INSERT INTO tasks (user_id, name) VALUES ('user-b-uuid', 'Steal data'); -- Should fail
-- 
-- Test 4: Verify unauthenticated requests are denied
-- RESET request.jwt.claims;
-- SELECT * FROM tasks; -- Should return no rows
-- 
-- Test 5: Verify User A cannot update User B's tasks
-- SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
-- UPDATE tasks SET name = 'Hacked' WHERE user_id = 'user-b-uuid'; -- Should update 0 rows
-- 
-- Test 6: Verify User A cannot delete User B's tasks
-- SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
-- DELETE FROM tasks WHERE user_id = 'user-b-uuid'; -- Should delete 0 rows
-- ============================================================================

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
-- 
-- 1. auth.uid() Function:
--    - Returns the user ID from the JWT token in the request
--    - Returns NULL if the request is not authenticated
--    - Automatically extracted from the Authorization header by Supabase
-- 
-- 2. USING vs WITH CHECK:
--    - USING: Determines which existing rows are visible/modifiable
--    - WITH CHECK: Validates new/updated rows meet the policy criteria
--    - Both are needed for UPDATE to prevent user_id changes
-- 
-- 3. Defense in Depth:
--    - Client-side code in src/App.tsx also filters by user_id
--    - This provides defense-in-depth but RLS is the primary security mechanism
--    - Even if client code is compromised, RLS prevents unauthorized access
-- 
-- 4. Anon Key Safety:
--    - The anon key is exposed to the client (in .env)
--    - This is safe because RLS policies restrict what the anon key can access
--    - Users can only access their own data, enforced at the database level
-- 
-- 5. Service Role Key:
--    - The service role key bypasses RLS policies
--    - NEVER expose the service role key to the client
--    - Only use it in secure backend environments
-- 
-- 6. Policy Performance:
--    - RLS policies are evaluated for every query
--    - Indexes on user_id (created in 20250101000001_initial_schema.sql) ensure fast policy checks
--    - Partial indexes further optimize common query patterns
-- ============================================================================

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Apply 20250101000003_rpc_functions.sql to create RPC functions
-- 2. Test RLS policies with multiple user accounts
-- 3. Verify anon key cannot access other users' data
-- ============================================================================
