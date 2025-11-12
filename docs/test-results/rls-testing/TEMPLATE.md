# RLS Policy Test Execution Log

**Test Date:** YYYY-MM-DD  
**Tester:** [Name]  
**Database:** [Supabase Project URL]  
**Environment:** [Development/Staging/Production]  
**Test Duration:** [X hours]

## Executive Summary

[Brief overview of RLS policy testing, scope, and overall findings]

## Test Users

- **User A:** `[UUID]` - `[email]`
- **User B:** `[UUID]` - `[email]`
- **User C:** `[UUID]` - `[email]`

## Test Data Setup

```sql
-- User A tasks
INSERT INTO tasks (user_id, name, status) VALUES 
  ('user-a-uuid', 'Task A1', 'pending'),
  ('user-a-uuid', 'Task A2', 'completed');

-- User B tasks
INSERT INTO tasks (user_id, name, status) VALUES 
  ('user-b-uuid', 'Task B1', 'pending'),
  ('user-b-uuid', 'Task B2', 'completed');

-- User C tasks
INSERT INTO tasks (user_id, name, status) VALUES 
  ('user-c-uuid', 'Task C1', 'pending'),
  ('user-c-uuid', 'Task C2', 'completed');
```

## Test Results Summary

| Test Case | Table | Policy | Status | Notes |
|-----------|-------|--------|--------|-------|
| RLS-TASKS-001 | tasks | SELECT | PASS | Users isolated |
| RLS-TASKS-002 | tasks | INSERT | PASS | Cross-user insert blocked |
| RLS-TASKS-003 | tasks | UPDATE | PASS | Cross-user update blocked |
| RLS-TASKS-004 | tasks | DELETE | PASS | Cross-user delete blocked |
| RLS-TASKS-005 | tasks | Unauth | PASS | Anon blocked |
| RLS-PREFS-001 | user_preferences | SELECT | PASS | Users isolated |
| RLS-PREFS-002 | user_preferences | INSERT | PASS | Cross-user insert blocked |
| RLS-PREFS-003 | user_preferences | UPDATE | PASS | Cross-user update blocked |
| RLS-RPC-001 | cleanup_tasks | Function | PASS | Isolation maintained |
| RLS-RPC-002 | mark_tasks_late | Function | PASS | Isolation maintained |

## Detailed Test Results

### 1. Tasks Table - SELECT Policy (RLS-TASKS-001)

**Test:** Users can only SELECT their own tasks

```sql
-- Test as User A
SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
SELECT COUNT(*) FROM tasks;
-- Expected: 2 (only User A's tasks)
-- Actual: [Result]

SELECT COUNT(*) FROM tasks WHERE user_id <> 'user-a-uuid';
-- Expected: 0 (cannot see other users' tasks)
-- Actual: [Result]
```

**Status:** [PASS/FAIL]  
**Notes:** [Any observations]

### 2. Tasks Table - INSERT Policy (RLS-TASKS-002)

**Test:** Users can only INSERT tasks with their own user_id

```sql
-- Test as User A: Insert with own ID (should succeed)
SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
INSERT INTO tasks (user_id, name) VALUES ('user-a-uuid', 'Test Task');
-- Expected: Success
-- Actual: [Result]

-- Test as User A: Insert with User B's ID (should fail)
INSERT INTO tasks (user_id, name) VALUES ('user-b-uuid', 'Malicious Task');
-- Expected: RLS error (insufficient_privilege)
-- Actual: [Result]
```

**Status:** [PASS/FAIL]  
**Notes:** [Any observations]

### 3. Tasks Table - UPDATE Policy (RLS-TASKS-003)

**Test:** Users can only UPDATE their own tasks

```sql
-- Test as User A: Update own task (should succeed)
SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
UPDATE tasks SET name = 'Updated' WHERE user_id = 'user-a-uuid' AND id = '[task-id]';
-- Expected: 1 row updated
-- Actual: [Result]

-- Test as User A: Update User B's task (should return 0 rows)
UPDATE tasks SET name = 'Hacked' WHERE user_id = 'user-b-uuid';
-- Expected: 0 rows updated
-- Actual: [Result]

-- Test as User A: Change user_id on own task (should fail)
UPDATE tasks SET user_id = 'user-b-uuid' WHERE user_id = 'user-a-uuid';
-- Expected: RLS error
-- Actual: [Result]
```

**Status:** [PASS/FAIL]  
**Notes:** [Any observations]

### 4. Tasks Table - DELETE Policy (RLS-TASKS-004)

**Test:** Users can only DELETE their own tasks

```sql
-- Test as User A: Delete own task (should succeed)
SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
DELETE FROM tasks WHERE user_id = 'user-a-uuid' AND id = '[task-id]';
-- Expected: 1 row deleted
-- Actual: [Result]

-- Test as User A: Delete User B's task (should return 0 rows)
DELETE FROM tasks WHERE user_id = 'user-b-uuid';
-- Expected: 0 rows deleted
-- Actual: [Result]
```

**Status:** [PASS/FAIL]  
**Notes:** [Any observations]

### 5. Tasks Table - Unauthenticated Access (RLS-TASKS-005)

**Test:** Unauthenticated users cannot access any tasks

```sql
-- Test without JWT claims
RESET request.jwt.claims;
SELECT COUNT(*) FROM tasks;
-- Expected: 0 rows
-- Actual: [Result]

INSERT INTO tasks (user_id, name) VALUES ('user-a-uuid', 'Anon Task');
-- Expected: RLS error
-- Actual: [Result]
```

**Status:** [PASS/FAIL]  
**Notes:** [Any observations]

### 6. User Preferences Table - SELECT Policy (RLS-PREFS-001)

**Test:** Users can only SELECT their own preferences

```sql
SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
SELECT COUNT(*) FROM user_preferences WHERE user_id <> 'user-a-uuid';
-- Expected: 0
-- Actual: [Result]
```

**Status:** [PASS/FAIL]  
**Notes:** [Any observations]

### 7. User Preferences Table - INSERT Policy (RLS-PREFS-002)

**Test:** Users can only INSERT preferences with their own user_id

```sql
SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
INSERT INTO user_preferences (user_id, theme) VALUES ('user-b-uuid', 'dark');
-- Expected: RLS error
-- Actual: [Result]
```

**Status:** [PASS/FAIL]  
**Notes:** [Any observations]

### 8. User Preferences Table - UPDATE Policy (RLS-PREFS-003)

**Test:** Users can only UPDATE their own preferences

```sql
SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
UPDATE user_preferences SET theme = 'light' WHERE user_id = 'user-b-uuid';
-- Expected: 0 rows updated
-- Actual: [Result]
```

**Status:** [PASS/FAIL]  
**Notes:** [Any observations]

### 9. RPC Function - cleanup_tasks (RLS-RPC-001)

**Test:** Function only affects calling user's tasks

```sql
-- Setup: Create old deleted tasks for both users
INSERT INTO tasks (user_id, name, status, deleted_at) VALUES
  ('user-a-uuid', 'Old A', 'deleted', NOW() - INTERVAL '31 days'),
  ('user-b-uuid', 'Old B', 'deleted', NOW() - INTERVAL '31 days');

-- Call as User A
SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
SELECT cleanup_tasks();

-- Verify: Only User A's old deleted tasks removed
SELECT COUNT(*) FROM tasks WHERE user_id = 'user-a-uuid' AND deleted_at IS NOT NULL;
-- Expected: 0
-- Actual: [Result]

SELECT COUNT(*) FROM tasks WHERE user_id = 'user-b-uuid' AND deleted_at IS NOT NULL;
-- Expected: 1 (User B's task still exists)
-- Actual: [Result]
```

**Status:** [PASS/FAIL]  
**Notes:** [Any observations]

### 10. RPC Function - mark_tasks_late (RLS-RPC-002)

**Test:** Function only affects calling user's tasks

```sql
-- Setup: Create overdue tasks for both users
INSERT INTO tasks (user_id, name, status, due_date) VALUES
  ('user-a-uuid', 'Overdue A', 'pending', NOW() - INTERVAL '25 hours'),
  ('user-b-uuid', 'Overdue B', 'pending', NOW() - INTERVAL '25 hours');

-- Call as User A
SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
SELECT mark_tasks_late();

-- Verify: Only User A's overdue tasks marked late
SELECT status FROM tasks WHERE user_id = 'user-a-uuid' AND name = 'Overdue A';
-- Expected: 'late'
-- Actual: [Result]

SELECT status FROM tasks WHERE user_id = 'user-b-uuid' AND name = 'Overdue B';
-- Expected: 'pending' (unchanged)
-- Actual: [Result]
```

**Status:** [PASS/FAIL]  
**Notes:** [Any observations]

## Client-Side Query Verification

**Test:** All client-side queries include `.eq('user_id', user.id)` where applicable

| File | Query | user_id Filter | Status |
|------|-------|----------------|--------|
| `App.tsx` | fetchTasks | Yes | PASS |
| `App.tsx` | addTask | Yes | PASS |
| `App.tsx` | updateTask | Yes | PASS |
| `App.tsx` | deleteTask | Yes | PASS |

**Status:** [PASS/FAIL]  
**Notes:** [Any observations]

## Findings

### Finding 1: [Title]
- **Severity:** Critical/High/Medium/Low
- **Test Case:** RLS-XXX-NNN
- **Description:** [Detailed description]
- **Impact:** [What an attacker could achieve]
- **Recommendation:** [How to fix]
- **Status:** Open/Fixed/Accepted Risk

## Recommendations

1. [Recommendation 1]
2. [Recommendation 2]

## Conclusion

[Overall assessment of RLS policy security]

## Sign-off

- **Tester:** [Name] - [Date]
- **Security Lead:** [Name] - [Date]
