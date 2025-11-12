# Row Level Security (RLS) Testing

## 1. Overview
- Verify DB-level isolation for `tasks` and `user_preferences` and RPC functions.
- Approach: Multi-user tests via SQL editor and client.

## 2. Setup
- Create User A/B/C and record UUIDs.
- Seed tasks per user.

## 3. Tasks Table Policies

### RLS-TASKS-001: SELECT Own Tasks
- Set `request.jwt.claims` to each user and `SELECT * FROM tasks;`
- Expect only own rows.

### RLS-TASKS-002: INSERT Own ID Only
- As User A: insert with A → succeed; with B → RLS error.

### RLS-TASKS-003: UPDATE Own Tasks Only
- Update own row → succeed; other’s ID → 0 rows; changing `user_id` → RLS error.

### RLS-TASKS-004: DELETE Own Tasks Only
- Delete own row → succeed; other’s → 0 rows.

### RLS-TASKS-005: Unauthenticated Access
- No JWT claims → 0 rows; writes fail.

## 4. User Preferences Policies
- SELECT/INSERT/UPDATE restricted to own `user_id`.

## 5. RPC Function Security

### RLS-RPC-001: cleanup_tasks
- With old deleted tasks for both users, call as User A → only A’s deleted tasks removed.

### RLS-RPC-002: mark_tasks_late
- With 25h-old tasks for both users, call as User A → only A’s marked late.

## 6. Client-Side Query Verification
- Verify all queries in UI include `.eq('user_id', user.id)` where applicable.

## 7. Automated RLS SQL Script

```sql
-- rls-test-suite.sql (excerpt)
SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
DO $$
DECLARE c INTEGER; BEGIN
  SELECT COUNT(*) INTO c FROM tasks WHERE user_id <> 'user-a-uuid';
  IF c > 0 THEN RAISE EXCEPTION 'FAIL: User A can see other users tasks';
  ELSE RAISE NOTICE 'PASS: User A can only see own tasks'; END IF;
END $$;

SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
DO $$ BEGIN
  INSERT INTO tasks (user_id, name) VALUES ('user-b-uuid', 'Malicious');
  RAISE EXCEPTION 'FAIL: Cross-user insert allowed';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: Cross-user insert blocked';
END $$;
```

## 8. Test Execution Log Template

```markdown
## RLS Policy Test Execution Log

**Test Date:** YYYY-MM-DD
**Tester:** [Name]
**Database:** [Supabase Project URL]
**Test Users:** User A (uuid), User B (uuid), User C (uuid)

| Test Case | Table | Policy | Status | Notes |
|-----------|-------|--------|--------|-------|
| RLS-TASKS-001 | tasks | SELECT | PASS | Users isolated |
| RLS-TASKS-002 | tasks | INSERT | PASS | Cross-user insert blocked |
| RLS-TASKS-003 | tasks | UPDATE | PASS | Cross-user update blocked |
| RLS-TASKS-004 | tasks | DELETE | PASS | Cross-user delete blocked |
| RLS-TASKS-005 | tasks | Unauth | PASS | Anon blocked |
| RLS-PREFS-001 | user_preferences | SELECT | PASS | Users isolated |
| RLS-RPC-001 | cleanup_tasks | Function | PASS | Isolation maintained |
| RLS-RPC-002 | mark_tasks_late | Function | PASS | Isolation maintained |
```
