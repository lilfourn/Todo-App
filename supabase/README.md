

# Supabase Database Documentation

This directory contains all Supabase-related configuration, migrations, and documentation for the Todo App database.

## Table of Contents

- [Overview](#overview)
- [Setup Instructions](#setup-instructions)
- [Database Schema](#database-schema)
- [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
- [RPC Functions](#rpc-functions)
- [Anon Key Permissions](#anon-key-permissions)
- [Security Best Practices](#security-best-practices)
- [Testing RLS Policies](#testing-rls-policies)
- [Troubleshooting](#troubleshooting)
- [Migration History](#migration-history)

## Overview

The Todo App uses Supabase as its backend database and authentication provider. The database architecture consists of:

### Tables
- **`tasks`** - User tasks with soft-delete support and late task tracking
- **`user_preferences`** - User UI preferences (theme and font)

### RPC Functions
- **`cleanup_tasks()`** - Permanently delete tasks soft-deleted for >48 hours
- **`mark_tasks_late()`** - Mark tasks as late if created >24 hours ago and incomplete

### Security Model
- Row Level Security (RLS) enabled on all tables
- All queries filter by authenticated user ID (`auth.uid()`)
- Anon key is safe to expose (RLS policies enforce user isolation)
- Service role key must never be exposed to client

## Setup Instructions

### Initial Setup

1. **Create a Supabase Project**
   - Go to https://supabase.com/dashboard
   - Click "New Project"
   - Choose your organization and region
   - Set a strong database password (save it securely)
   - Wait for project initialization (~2 minutes)

2. **Copy Project Credentials**
   - Navigate to Project Settings > API
   - Copy the **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - Copy the **anon public** key (starts with `eyJ...`)
   - Add these to your `.env` file:
     ```
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key-here
     ```
   - See main [README.md](../README.md#security--configuration) for detailed environment setup

3. **Apply Database Migrations**
   - Navigate to Supabase Dashboard > SQL Editor
   - Apply migrations in order (see below)

### Applying Migrations

**Method 1: Supabase Dashboard (Recommended for first-time setup)**

1. Open Supabase Dashboard > SQL Editor
2. Click "New Query"
3. Copy the contents of `migrations/20250101000001_initial_schema.sql`
4. Paste into the SQL Editor
5. Click "Run" or press `Cmd/Ctrl + Enter`
6. Verify no errors in the output (should see "Success. No rows returned")
7. Repeat for `20250101000002_enable_rls.sql`
8. Repeat for `20250101000003_rpc_functions.sql`

**Method 2: Supabase CLI (For ongoing development)**

```bash
# Install Supabase CLI globally
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations to database
supabase db push

# Verify migrations applied
supabase db remote commit
```

**Finding your project ref:**
- Go to Project Settings > General
- Copy the "Reference ID" (e.g., `abcdefghijklmnop`)

### Verifying Setup

After applying migrations, verify everything is set up correctly:

```sql
-- Check that tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
-- Should return: tasks, user_preferences

-- Check that RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public';
-- Should show rowsecurity = true for both tables

-- Check that policies exist
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
-- Should show 4 policies per table (SELECT, INSERT, UPDATE, DELETE)

-- Check that RPC functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';
-- Should return: cleanup_tasks, mark_tasks_late
```

## Database Schema

### tasks Table

Stores user tasks with soft-delete support and late task tracking.

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | NO | - | Foreign key to `auth.users(id)` |
| `name` | TEXT | NO | - | Task name (1-500 characters) |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Task creation timestamp |
| `completed_at` | TIMESTAMPTZ | YES | NULL | Task completion timestamp |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft-delete timestamp |
| `is_late` | BOOLEAN | NO | `false` | Flag for tasks >24 hours old |

**Constraints:**

- `PRIMARY KEY (id)` - Unique identifier for each task
- `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` - Ensures task ownership
- `CHECK (length(trim(name)) > 0 AND length(name) <= 500)` - Validates task name
- `CHECK (completed_at IS NULL OR completed_at >= created_at)` - Prevents time paradoxes
- `CHECK (deleted_at IS NULL OR deleted_at >= created_at)` - Prevents time paradoxes
- `CHECK (completed_at IS NULL OR deleted_at IS NOT NULL)` - Completed tasks must be soft-deleted
- Partial unique index `idx_tasks_unique_active_name` on `(user_id, name) WHERE deleted_at IS NULL` - Prevents duplicate active task names (enforced by index, not table constraint)

**Indexes:**

- `idx_tasks_user_id` - Speeds up user-specific queries (used in `src/App.tsx` line 36-40)
- `idx_tasks_user_active` - Partial index for active tasks (used throughout `src/App.tsx`)
- `idx_tasks_cleanup` - Speeds up cleanup operations (used by `cleanup_tasks()` RPC)
- `idx_tasks_late` - Speeds up late task marking (used by `mark_tasks_late()` RPC)

**Relationships:**

- `user_id` → `auth.users.id` (CASCADE DELETE: deleting a user deletes all their tasks)

**Referenced in Code:**

- `src/App.tsx` lines 39, 91, 160, 201-202, 237-238

### user_preferences Table

Stores user-specific UI preferences (theme and font). Each user has at most one preferences row.

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `user_id` | UUID | NO | - | Primary key and foreign key to `auth.users(id)` |
| `theme` | TEXT | NO | `'dark'` | UI theme: 'light' or 'dark' |
| `font` | TEXT | NO | `'system'` | UI font: 'system', 'mono', or 'serif' |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Preferences creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

**Constraints:**

- `PRIMARY KEY (user_id)` - One preference row per user
- `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` - Ensures preference ownership
- `CHECK (theme IN ('light', 'dark'))` - Validates theme value
- `CHECK (font IN ('system', 'mono', 'serif'))` - Validates font value
- `CHECK (updated_at >= created_at)` - Ensures logical timestamp ordering

**Indexes:**

- Primary key on `user_id` provides automatic index (sufficient for single-row lookups)

**Relationships:**

- `user_id` → `auth.users.id` (CASCADE DELETE: deleting a user deletes their preferences)

**Referenced in Code:**

- `src/components/Preferences.tsx` lines 27, 93, 116, 141

## Row Level Security (RLS) Policies

RLS is the primary security mechanism that enforces user data isolation at the database level. All policies use `auth.uid()` which returns the authenticated user's ID from the JWT token.

### tasks Table Policies

#### 1. `tasks_select_own` (SELECT)

**Purpose:** Users can only view their own tasks

**USING Clause:**
```sql
auth.uid() = user_id
```

**Behavior:**
- Allows users to read only rows where `user_id` matches their authenticated user ID
- Unauthenticated requests return no rows (auth.uid() returns NULL)

**Used by:** All SELECT queries in `src/App.tsx` (lines 39, 91, 160, 201-202, 237-238)

**Example:**
```sql
-- User A can only see their own tasks
SELECT * FROM tasks; -- Returns only tasks where user_id = User A's ID
```

#### 2. `tasks_insert_own` (INSERT)

**Purpose:** Users can only create tasks with their own user_id

**WITH CHECK Clause:**
```sql
auth.uid() = user_id 
AND completed_at IS NULL 
AND deleted_at IS NULL
```

**Behavior:**
- Ensures inserted tasks have `user_id` matching the authenticated user
- Enforces that new tasks must be active (not completed or deleted)
- Prevents users from inserting tasks for other users

**Used by:** INSERT operations in `src/App.tsx` (line 237-238)

**Example:**
```sql
-- User A can insert tasks with their own user_id
INSERT INTO tasks (user_id, name) VALUES (auth.uid(), 'My Task'); -- Success

-- User A cannot insert tasks for User B
INSERT INTO tasks (user_id, name) VALUES ('user-b-id', 'Steal data'); -- Fails RLS policy
```

#### 3. `tasks_update_own` (UPDATE)

**Purpose:** Users can only update their own tasks and cannot change user_id

**USING Clause:**
```sql
auth.uid() = user_id
```

**WITH CHECK Clause:**
```sql
auth.uid() = user_id
```

**Behavior:**
- USING: Determines which rows can be selected for update
- WITH CHECK: Validates the updated row still belongs to the user
- Prevents users from changing `user_id` to another user

**Used by:** UPDATE operations in `src/App.tsx` (lines 91, 160, 201-202)

**Example:**
```sql
-- User A can update their own tasks
UPDATE tasks SET name = 'Updated' WHERE id = 'task-id'; -- Success if task belongs to User A

-- User A cannot update User B's tasks
UPDATE tasks SET name = 'Hacked' WHERE user_id = 'user-b-id'; -- Updates 0 rows

-- User A cannot change user_id to User B
UPDATE tasks SET user_id = 'user-b-id' WHERE id = 'my-task-id'; -- Fails WITH CHECK
```

#### 4. `tasks_delete_own` (DELETE)

**Purpose:** Users can only delete their own tasks

**USING Clause:**
```sql
auth.uid() = user_id
```

**Behavior:**
- Allows users to hard delete their own tasks
- Note: The app uses soft deletes (setting `deleted_at`), but this policy allows hard deletes if needed

**Used by:** Potential future hard delete operations (currently app uses soft deletes)

**Example:**
```sql
-- User A can delete their own tasks
DELETE FROM tasks WHERE id = 'my-task-id'; -- Success

-- User A cannot delete User B's tasks
DELETE FROM tasks WHERE user_id = 'user-b-id'; -- Deletes 0 rows
```

### user_preferences Table Policies

#### 1. `preferences_select_own` (SELECT)

**Purpose:** Users can only view their own preferences

**USING Clause:**
```sql
auth.uid() = user_id
```

**Used by:** SELECT query in `src/components/Preferences.tsx` (line 23-27)

#### 2. `preferences_insert_own` (INSERT)

**Purpose:** Users can only create preferences with their own user_id

**WITH CHECK Clause:**
```sql
auth.uid() = user_id
```

**Used by:** UPSERT operations in `src/components/Preferences.tsx` (lines 100-108, 125-133)

#### 3. `preferences_update_own` (UPDATE)

**Purpose:** Users can only update their own preferences

**USING Clause:**
```sql
auth.uid() = user_id
```

**WITH CHECK Clause:**
```sql
auth.uid() = user_id
```

**Used by:** UPSERT operations in `src/components/Preferences.tsx` (lines 100-108, 125-133)

#### 4. `preferences_delete_own` (DELETE)

**Purpose:** Users can only delete their own preferences

**USING Clause:**
```sql
auth.uid() = user_id
```

**Note:** Currently not used in the app, but provided for completeness.

## RPC Functions

RPC (Remote Procedure Call) functions are PostgreSQL functions that can be called from the client via Supabase. Both functions use `SECURITY DEFINER` for efficiency but filter by `auth.uid()` for security.

### cleanup_tasks()

**Purpose:** Permanently delete tasks that have been soft-deleted for more than 48 hours

**Signature:**
```sql
CREATE OR REPLACE FUNCTION cleanup_tasks()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
```

**Security Model:**
- Uses `SECURITY DEFINER` to run with elevated privileges (bypasses RLS)
- **CRITICAL:** Filters by `auth.uid()` inside the function to only delete the calling user's tasks
- Cannot be exploited to access other users' data

**Function Body:**
```sql
DELETE FROM tasks
WHERE user_id = auth.uid()
  AND deleted_at IS NOT NULL
  AND deleted_at < now() - interval '48 hours';
```

**Called from:** `src/App.tsx` line 66, 118 (hourly cleanup)

**Why SECURITY DEFINER is safe:**
- Function explicitly filters by `auth.uid()` in the WHERE clause
- Users can only delete their own tasks
- More efficient than SECURITY INVOKER for bulk operations

**Permissions:**
- Granted to `authenticated` role
- Revoked from `anon` role (only logged-in users can call)

### mark_tasks_late()

**Purpose:** Mark tasks as late if they were created more than 24 hours ago and are still incomplete

**Signature:**
```sql
CREATE OR REPLACE FUNCTION mark_tasks_late()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
```

**Security Model:**
- Uses `SECURITY DEFINER` with `auth.uid()` filtering
- Only updates the calling user's tasks

**Function Body:**
```sql
UPDATE tasks
SET is_late = true
WHERE user_id = auth.uid()
  AND created_at < now() - interval '24 hours'
  AND completed_at IS NULL
  AND deleted_at IS NULL
  AND is_late = false;
```

**Called from:** `src/App.tsx` line 69, 118 (hourly check)

**Permissions:**
- Granted to `authenticated` role
- Revoked from `anon` role

## Anon Key Permissions

The anon key is the public API key exposed to the client. It's safe to expose because RLS policies restrict what it can access.

### Allowed Operations (via RLS policies)

✅ **Tasks:**
- Read own tasks (`SELECT` with `auth.uid() = user_id`)
- Create own tasks (`INSERT` with `auth.uid() = user_id`)
- Update own tasks (`UPDATE` with `auth.uid() = user_id`)
- Delete own tasks (`DELETE` with `auth.uid() = user_id`)

✅ **User Preferences:**
- Read own preferences (`SELECT` with `auth.uid() = user_id`)
- Create own preferences (`INSERT` with `auth.uid() = user_id`)
- Update own preferences (`UPDATE` with `auth.uid() = user_id`)
- Delete own preferences (`DELETE` with `auth.uid() = user_id`)

✅ **RPC Functions:**
- Call `cleanup_tasks()` (only affects own data)
- Call `mark_tasks_late()` (only affects own data)

✅ **Authentication:**
- Sign up (create new user account)
- Sign in (authenticate existing user)
- Sign out (end session)
- Reset password (via email)

### Denied Operations (by RLS and Supabase)

❌ **Data Access:**
- Read other users' tasks (blocked by RLS `USING` clause)
- Modify other users' tasks (blocked by RLS `USING` and `WITH CHECK` clauses)
- Read other users' preferences (blocked by RLS)
- Modify other users' preferences (blocked by RLS)

❌ **System Access:**
- Access `auth.users` table directly (blocked by Supabase)
- Execute arbitrary SQL (blocked by Supabase)
- Bypass RLS policies (only service role can do this)
- Administrative operations (blocked by Supabase)

❌ **RPC Functions:**
- Call functions as anonymous user (revoked from `anon` role)
- Affect other users' data via RPC (blocked by `auth.uid()` filtering)

### Service Role Key (Never Expose!)

The service role key bypasses all RLS policies and should **NEVER** be exposed to the client.

**Use cases for service role key:**
- Backend services that need full database access
- Administrative scripts
- Database migrations
- Bulk operations across all users

**Security:**
- Store in secure backend environment variables only
- Never commit to version control
- Never send to client
- Rotate immediately if compromised

## Security Best Practices

### For Developers

1. **Always Rely on RLS as Primary Security**
   - Client-side `user_id` filtering (in `src/App.tsx`) is defense-in-depth, not primary security
   - Even if client code is compromised, RLS prevents unauthorized access
   - Never assume client-side validation is sufficient

2. **Test with Multiple User Accounts**
   - Create at least 2 test accounts
   - Verify User A cannot access User B's data
   - Test all CRUD operations with different users

3. **Never Use Service Role Key in Client**
   - Only use anon key in client-side code
   - Service role key should only be in secure backend environments
   - Rotate service role key if accidentally exposed

4. **Keep Migrations in Version Control**
   - All schema changes must be in `supabase/migrations/`
   - Never make ad-hoc schema changes in production
   - Document all migrations with comments

5. **Review Supabase Audit Logs Regularly**
   - Check for unusual query patterns
   - Monitor for RLS policy violations
   - Set up alerts for suspicious activity

### For Production

1. **Enable Supabase Security Features**
   - Configure IP allowlists (if applicable)
   - Enable rate limiting (Supabase has built-in rate limiting)
   - Set up monitoring and alerts

2. **Regular Security Audits**
   - Review RLS policies before major releases
   - Test with penetration testing tools
   - Keep dependencies up to date

3. **Incident Response Plan**
   - Document steps for handling security incidents
   - Have a plan for rotating credentials
   - Know how to notify affected users

## Testing RLS Policies

### Manual Testing in Supabase SQL Editor

You can test RLS policies by setting the JWT claims to simulate different users:

```sql
-- Test as User A
SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
SELECT * FROM tasks; -- Should only see User A's tasks

-- Test as User B
SET request.jwt.claims TO '{"sub": "user-b-uuid"}';
SELECT * FROM tasks; -- Should only see User B's tasks

-- Test as unauthenticated user
RESET request.jwt.claims;
SELECT * FROM tasks; -- Should return no rows
```

### Test Cases

**Test 1: User A cannot read User B's tasks**
```sql
SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
SELECT * FROM tasks WHERE user_id = 'user-b-uuid'; -- Should return 0 rows
```

**Test 2: User A cannot insert tasks with User B's user_id**
```sql
SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
INSERT INTO tasks (user_id, name) VALUES ('user-b-uuid', 'Steal data'); 
-- Should fail with: new row violates row-level security policy
```

**Test 3: User A cannot update User B's tasks**
```sql
SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
UPDATE tasks SET name = 'Hacked' WHERE user_id = 'user-b-uuid'; 
-- Should update 0 rows (silently fails due to USING clause)
```

**Test 4: User A cannot change their task's user_id to User B**
```sql
SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
UPDATE tasks SET user_id = 'user-b-uuid' WHERE id = 'my-task-id'; 
-- Should fail with: new row violates row-level security policy (WITH CHECK clause)
```

**Test 5: RPC functions only affect calling user's data**
```sql
-- As User A, create old task
SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
INSERT INTO tasks (user_id, name, deleted_at) VALUES ('user-a-uuid', 'Old Task', now() - interval '49 hours');

-- Call cleanup as User A
SELECT cleanup_tasks(); -- Should delete User A's old task

-- Verify User B's tasks are unaffected
SET request.jwt.claims TO '{"sub": "user-b-uuid"}';
SELECT * FROM tasks WHERE user_id = 'user-b-uuid'; -- Should still show all User B's tasks
```

## Troubleshooting

### "permission denied for table tasks"

**Cause:** RLS is enabled but no policies exist, or policies are misconfigured.

**Solution:**
1. Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
2. Check policies exist: `SELECT * FROM pg_policies WHERE schemaname = 'public';`
3. Re-apply `20250101000002_enable_rls.sql` migration

### "new row violates row-level security policy"

**Cause:** WITH CHECK clause failed (trying to insert/update with wrong user_id).

**Solution:**
1. Ensure client sends correct `user_id` (should be `user.id` from auth context)
2. Check that user is authenticated (`auth.uid()` is not NULL)
3. Verify the operation doesn't try to change `user_id` to another user

### "null value in column user_id violates not-null constraint"

**Cause:** Client not authenticated or not sending `user_id`.

**Solution:**
1. Check that user is authenticated before database operations
2. Verify `user.id` is available in the auth context
3. Ensure `user_id` is included in INSERT/UPDATE operations

### RPC functions not working

**Cause:** Missing GRANT EXECUTE permissions or functions don't exist.

**Solution:**
1. Verify functions exist: `SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';`
2. Check permissions: `SELECT * FROM information_schema.routine_privileges WHERE routine_schema = 'public';`
3. Re-apply `20250101000003_rpc_functions.sql` migration

### Slow queries

**Cause:** Missing indexes or inefficient query patterns.

**Solution:**
1. Verify indexes exist: `SELECT * FROM pg_indexes WHERE schemaname = 'public';`
2. Use `EXPLAIN ANALYZE` to identify slow queries
3. Ensure queries filter by `user_id` (uses `idx_tasks_user_id` index)
4. Consider adding additional indexes for common query patterns

## Migration History

| Migration File | Date Applied | Applied By | Description |
|---------------|--------------|------------|-------------|
| `20250101000001_initial_schema.sql` | TBD | TBD | Initial schema with tasks and user_preferences tables |
| `20250101000002_enable_rls.sql` | TBD | TBD | Enable RLS and create security policies |
| `20250101000003_rpc_functions.sql` | TBD | TBD | Create cleanup_tasks and mark_tasks_late RPC functions |
| `20250101000004_drop_unique_constraint.sql` | TBD | TBD | Drop conflicting unique_active_task_name constraint from tasks table |
| `20250101000005_enforce_not_null_preferences.sql` | TBD | TBD | Backfill NULL values and enforce NOT NULL on theme and font columns |

**Note:** Update this table each time you apply a migration to track database changes.

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Main Project README](../README.md)
- [Security Policy](../SECURITY.md)
