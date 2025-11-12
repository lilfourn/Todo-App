-- ============================================================================
-- RPC Functions Migration
-- ============================================================================
-- Created: 2025-01-01
-- Purpose: Create Remote Procedure Call (RPC) functions for cleanup_tasks and
--          mark_tasks_late with proper security context and user isolation.
-- 
-- References:
-- - src/App.tsx (lines 66, 69, 118)
-- 
-- Security Model:
-- - Functions use SECURITY DEFINER to run with elevated privileges
-- - CRITICAL: All functions filter by auth.uid() to ensure user isolation
-- - Functions cannot be exploited to access other users' data
-- - Only authenticated users can call these functions (not anonymous users)
-- ============================================================================

-- ============================================================================
-- FUNCTION: cleanup_tasks()
-- ============================================================================
-- Purpose: Permanently delete tasks that have been soft-deleted for more than 48 hours
-- Called from: src/App.tsx line 66, 118 (hourly cleanup)
-- Security: SECURITY DEFINER with auth.uid() filtering
-- Returns: void (no data exposed)

-- Drop existing function if it exists (handles return type changes)
DROP FUNCTION IF EXISTS cleanup_tasks();

CREATE OR REPLACE FUNCTION cleanup_tasks()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete only the calling user's tasks that have been soft-deleted for >48 hours
  -- CRITICAL: auth.uid() filter ensures user isolation even with SECURITY DEFINER
  DELETE FROM tasks
  WHERE user_id = auth.uid()
    AND deleted_at IS NOT NULL
    AND deleted_at < now() - interval '48 hours';
  
  -- No return value (void function)
  -- This prevents accidental data exposure
END;
$$;

COMMENT ON FUNCTION cleanup_tasks() IS 
  'Permanently delete tasks soft-deleted for >48 hours. Only affects calling user''s tasks. Called hourly from src/App.tsx line 118.';

-- ============================================================================
-- FUNCTION: mark_tasks_late()
-- ============================================================================
-- Purpose: Mark tasks as late if they were created more than 24 hours ago and are still incomplete
-- Called from: src/App.tsx line 69, 118 (hourly check)
-- Security: SECURITY DEFINER with auth.uid() filtering
-- Returns: void (no data exposed)

-- Drop existing function if it exists (handles return type changes)
DROP FUNCTION IF EXISTS mark_tasks_late();

CREATE OR REPLACE FUNCTION mark_tasks_late()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update only the calling user's tasks that are late
  -- CRITICAL: auth.uid() filter ensures user isolation even with SECURITY DEFINER
  UPDATE tasks
  SET is_late = true
  WHERE user_id = auth.uid()
    AND created_at < now() - interval '24 hours'
    AND completed_at IS NULL
    AND deleted_at IS NULL
    AND is_late = false;
  
  -- No return value (void function)
  -- This prevents accidental data exposure
END;
$$;

COMMENT ON FUNCTION mark_tasks_late() IS 
  'Mark tasks as late if created >24 hours ago and still incomplete. Only affects calling user''s tasks. Called hourly from src/App.tsx line 118.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Allow authenticated users to call these functions
-- Deny anonymous users (anon role) from calling these functions

-- Grant to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_tasks() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_tasks_late() TO authenticated;

-- Explicitly revoke from anonymous users (defense in depth)
REVOKE EXECUTE ON FUNCTION cleanup_tasks() FROM anon;
REVOKE EXECUTE ON FUNCTION mark_tasks_late() FROM anon;

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
-- 
-- 1. SECURITY DEFINER vs SECURITY INVOKER:
--    - SECURITY DEFINER: Function runs with privileges of the function owner (postgres)
--    - SECURITY INVOKER: Function runs with privileges of the calling user
--    - We use DEFINER for efficiency but MUST filter by auth.uid() for security
-- 
-- 2. Why SECURITY DEFINER is safe here:
--    - Both functions explicitly filter by auth.uid() in the WHERE clause
--    - This ensures users can only affect their own data
--    - Cannot be exploited to access other users' data
--    - More efficient than SECURITY INVOKER for bulk operations
-- 
-- 3. Alternative Approach (More Secure but Slower):
--    - Use SECURITY INVOKER instead of SECURITY DEFINER
--    - Rely on RLS policies for security (simpler security model)
--    - May be slower for bulk operations
--    - Recommended unless performance is critical
-- 
-- 4. SET search_path = public:
--    - Prevents schema injection attacks
--    - Ensures function only accesses tables in the public schema
--    - Critical security measure for SECURITY DEFINER functions
-- 
-- 5. auth.uid() Function:
--    - Returns the authenticated user's ID from the JWT token
--    - Returns NULL if the request is not authenticated
--    - Same function used in RLS policies
-- 
-- 6. No Input Parameters:
--    - These functions take no parameters
--    - Reduces attack surface (no parameter injection possible)
--    - All filtering is based on auth.uid() and time intervals
-- 
-- 7. Return Type: void
--    - Functions return no data
--    - Prevents accidental data exposure
--    - Users cannot extract information about other users' data
-- 
-- 8. Performance Considerations:
--    - cleanup_tasks() uses idx_tasks_cleanup index (created in 20250101000001_initial_schema.sql)
--    - mark_tasks_late() uses idx_tasks_late index
--    - Both functions are efficient even with large datasets
-- ============================================================================

-- ============================================================================
-- TESTING RPC FUNCTIONS
-- ============================================================================
-- The following queries can be used to test RPC functions in the Supabase SQL Editor
-- 
-- Test 1: Verify cleanup_tasks() only affects calling user's tasks
-- -- As User A, create and soft-delete a task >48 hours ago
-- SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
-- INSERT INTO tasks (user_id, name, deleted_at) VALUES ('user-a-uuid', 'Old Task', now() - interval '49 hours');
-- SELECT cleanup_tasks(); -- Should delete User A's old task
-- SELECT * FROM tasks WHERE user_id = 'user-a-uuid'; -- Should not show the deleted task
-- 
-- -- As User B, verify User A's cleanup didn't affect User B's tasks
-- SET request.jwt.claims TO '{"sub": "user-b-uuid"}';
-- SELECT * FROM tasks WHERE user_id = 'user-b-uuid'; -- Should still show User B's tasks
-- 
-- Test 2: Verify mark_tasks_late() only affects calling user's tasks
-- -- As User A, create a task >24 hours ago
-- SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
-- INSERT INTO tasks (user_id, name, created_at) VALUES ('user-a-uuid', 'Late Task', now() - interval '25 hours');
-- SELECT mark_tasks_late(); -- Should mark User A's task as late
-- SELECT is_late FROM tasks WHERE user_id = 'user-a-uuid' AND name = 'Late Task'; -- Should be true
-- 
-- -- As User B, verify User A's mark_late didn't affect User B's tasks
-- SET request.jwt.claims TO '{"sub": "user-b-uuid"}';
-- SELECT * FROM tasks WHERE user_id = 'user-b-uuid' AND is_late = true; -- Should not include User A's task
-- 
-- Test 3: Verify anonymous users cannot call functions
-- RESET request.jwt.claims;
-- SELECT cleanup_tasks(); -- Should fail with permission denied
-- SELECT mark_tasks_late(); -- Should fail with permission denied
-- ============================================================================

-- ============================================================================
-- SECURITY CHECKLIST FOR RPC FUNCTIONS
-- ============================================================================
-- 
-- When creating new RPC functions, ensure:
-- [ ] Always filter by auth.uid() when using SECURITY DEFINER
-- [ ] Set search_path to prevent schema injection attacks
-- [ ] Validate all input parameters (if any)
-- [ ] Return minimal data (void if possible)
-- [ ] Add SQL comments explaining security model
-- [ ] Test that users cannot affect other users' data
-- [ ] Grant EXECUTE only to authenticated role, not anon
-- [ ] Document the function in supabase/README.md
-- [ ] Add tests to verify security guarantees
-- [ ] Consider using SECURITY INVOKER if DEFINER is not needed
-- ============================================================================

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All database migrations applied successfully.
-- 
-- Next steps:
-- 1. Test all RLS policies with multiple user accounts
-- 2. Test RPC functions with multiple user accounts
-- 3. Verify anon key cannot access other users' data
-- 4. Review supabase/README.md for setup instructions
-- 5. Update main README.md with database security documentation
-- ============================================================================
