# Todo App

A minimalist Tauri desktop todo application with local storage and elegant animations.

## Features

- **Minimalist UI**: Clean, aesthetic design with smooth animations
- **Keyboard Shortcuts**:
  - `Cmd + N` (or `Ctrl + N`): Create new task
  - `Cmd + Z` (or `Ctrl + Z`): Undo last completion
  - `Escape`: Cancel task creation
- **Local Storage**: All tasks persist locally using Tauri's filesystem
- **Progress Tracking**: Animated progress bar showing daily completion
- **Smart Task Management**:
  - Tasks marked as "late" after 24 hours (if uncompleted)
  - Completed tasks automatically removed after 48 hours
  - Undo system keeps last 10 completed tasks
- **Auto-cleanup**: Runs hourly to manage task lifecycle

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Desktop**: Tauri 2.9.2 (latest stable)
- **Backend**: Supabase (Authentication & Database)
- **Styling**: Custom CSS with animations
- **Storage**: Tauri Plugin FS 2.1.3
- **Plugins**: Dialog 2.1.3, Deep Link 2.0.1

## Security & Configuration

### Environment Setup

**⚠️ IMPORTANT: This app requires Supabase credentials to function.**

Before running the application, you must configure your environment variables:

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Get your Supabase credentials:**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project (or create a new one)
   - Navigate to **Settings > API**
   - Copy the following values:
     - **Project URL** → `VITE_SUPABASE_URL`
     - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

3. **Fill in your `.env` file:**
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Validate your configuration:**
   ```bash
   npm run validate-env
   ```

### Security Best Practices

#### Content Security Policy (CSP)
This app implements a strict Content Security Policy configured in `src-tauri/tauri.conf.json` to prevent:
- Cross-Site Scripting (XSS) attacks
- Unauthorized external resource loading
- Code injection vulnerabilities

The CSP whitelists only necessary resources:
- Tauri's internal protocols (`asset:`, `customprotocol:`, `ipc:`)
- All Supabase project endpoints via wildcard patterns (`*.supabase.co`, `*.supabase.in`)
- Local development server (dev mode only)

**Note:** The CSP uses wildcard patterns (`https://*.supabase.co` and `wss://*.supabase.co`) to support any Supabase project without hardcoding specific project URLs. This allows the app to work with different Supabase projects by simply changing the `.env` file.

#### API Key Safety
The **Supabase anon key** is safe for client-side use because:
- It's protected by Row Level Security (RLS) policies in your database
- It only grants access to data explicitly allowed by your RLS rules
- It cannot perform administrative operations

**However**, you must still protect it from git commits to prevent unauthorized access.

#### Secret Management

**🚨 CRITICAL: Never commit `.env` to version control**

The `.env` file is already in `.gitignore`, but if it's ever accidentally committed:

1. **Remove from version control immediately:**
   ```bash
   git rm --cached .env
   git commit -m "Remove .env from version control"
   ```

2. **Rotate your credentials immediately:**
   - Go to Supabase Dashboard > Settings > API
   - Click "Generate new anon key"
   - **Revoke/invalidate the old key** to prevent unauthorized access
   - Update your local `.env` file with the new key

3. **Purge from git history (REQUIRED):**
   ```bash
   # Option A: Using BFG Repo-Cleaner (recommended, faster)
   brew install bfg  # or download from https://rtyley.github.io/bfg-repo-cleaner/
   bfg --delete-files .env
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   
   # Option B: Using git filter-branch
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch .env' \
     --prune-empty --tag-name-filter cat -- --all
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

4. **Force push and notify team:**
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```
   ⚠️ **Coordinate with your team before force pushing!** All team members must re-clone or reset their local repositories.

5. **Verify it's not tracked:**
   ```bash
   npm run check-secrets
   ```

**Note:** If `.env` was ever committed, the old credentials are permanently exposed in git history until purged. Always rotate keys immediately.

#### Automated Validation

The project includes automated checks to prevent security issues:

- **`npm run validate-env`**: Validates environment variable format
- **`npm run check-secrets`**: Checks if `.env` is tracked by git
- **`npm run prebuild`**: Automatically runs before builds to catch misconfigurations

**Git Hooks (via Husky):**

After running `npm install`, Husky will automatically set up git hooks:
- **pre-commit**: Runs `npm run check-secrets` to prevent committing `.env`
- **pre-push**: Runs `npm run validate-env` to ensure proper configuration

To manually initialize Husky (if needed):
```bash
npm install
npx husky install
```

### Troubleshooting

#### Error: "Missing Supabase environment variables"
- Ensure you've copied `.env.example` to `.env`
- Verify both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Run `npm run validate-env` for detailed diagnostics

#### Error: "Invalid VITE_SUPABASE_URL format"
- URL must start with `https://`
- URL must end with `.supabase.co` or `.supabase.in`
- Example: `https://zuoretuprnsnjrxybywn.supabase.co`

#### Error: "Invalid VITE_SUPABASE_ANON_KEY format"
- Key must be a valid JWT token
- Should start with `eyJ` and contain exactly 3 parts separated by dots
- Copy the exact value from Supabase Dashboard > Settings > API

#### CSP Errors in Console
If you see Content Security Policy violations:
- Verify your Supabase URL matches the one in `src-tauri/tauri.conf.json`
- Check that you're not loading resources from unauthorized domains
- Review the CSP configuration in the security section

## Authentication Security

This application implements comprehensive security measures to protect user authentication and data:

### Deep Link Validation

All incoming deep links are validated against strict security criteria:

- **Scheme Validation**: Only `todoapp://` protocol is accepted
- **Path Allowlist**: Only `/auth/callback` and `/auth/password-reset` paths are permitted
- **Parameter Validation**: Query parameters are validated against an allowlist (`access_token`, `refresh_token`, `type`, `token_hash`, `state`)
- **URL Length Limits**: Maximum 2048 characters to prevent buffer overflow attacks
- **Fragment Rejection**: URL fragments are not allowed
- **Duplicate Parameter Detection**: Prevents parameter injection attacks

Malformed or suspicious URLs are rejected with detailed logging for security auditing.

### Rate Limiting

Login and sign-up attempts are rate limited to prevent brute force attacks:

- **Default Limits**: 5 attempts per 15 minutes per email address
- **Exponential Backoff**: Failed attempts result in increasing lockout periods (30 min → 1 hour → 2 hours max)
- **Client-Side Tracking**: Rate limits are enforced client-side with persistent storage
- **Clear User Feedback**: Users see remaining attempts and lockout duration
- **Automatic Reset**: Rate limits clear on successful authentication

**User Experience:**
- After 3 failed attempts, users see a warning about remaining attempts
- After 5 failed attempts, users are temporarily locked out
- Lockout duration increases with repeated violations

### CSRF Protection

State tokens protect against Cross-Site Request Forgery attacks:

- **Token Generation**: Cryptographically secure random tokens (32 bytes, base64url encoded)
- **Token Storage**: Tokens stored in sessionStorage with timestamps
- **Token Validation**: Deep link callbacks require valid state parameter matching stored token
- **Token Expiry**: Tokens expire after 5 minutes
- **Automatic Cleanup**: Tokens are cleared after successful validation

**Protected Flows:**
- Email confirmation (sign-up)
- Password reset
- OAuth callbacks (if implemented)

### Password Reset Security

Password reset links use Tauri deep link protocol for secure redirection:

- **Deep Link Protocol**: Uses `todoapp://auth/password-reset` instead of web URLs
- **State Token Validation**: CSRF protection via state parameter
- **Single-Use Tokens**: Reset tokens are single-use and expire after 1 hour (Supabase default)
- **In-App Password Entry**: New password is entered within the app, not on a web page

**⚠️ Configuration Required:**

Add `todoapp://auth/password-reset` to your Supabase project:
1. Go to Supabase Dashboard > Authentication > URL Configuration
2. Add to **Additional Redirect URLs**: `todoapp://auth/password-reset`
3. Ensure your password reset email template uses `{{ .RedirectTo }}` to respect the custom redirect URL

### Security Utilities

All security functions are centralized in `src/lib/security.ts`:

- **`validateDeepLinkUrl()`**: Validates incoming deep link URLs
- **`RateLimiter` class**: Manages rate limiting with exponential backoff
- **`generateStateToken()`**: Creates cryptographically secure CSRF tokens
- **`storeStateToken()` / `validateStateToken()`**: Manages token lifecycle
- **`sanitizeUrl()`**: Normalizes and sanitizes URLs
- **`isValidEmail()`**: Basic email format validation

### Testing Security Features

**Test Rate Limiting:**
```bash
# Attempt multiple failed logins with the same email
# After 5 attempts, you should be temporarily locked out
```

**Test Deep Link Validation:**
```bash
# Try opening malicious deep links (these should be rejected):
open "todoapp://evil.com/auth/callback?access_token=stolen"
open "todoapp://auth/callback?malicious_param=value"
open "todoapp://auth/../../etc/passwd"
```

**Test Password Reset Flow:**
1. Click "Reset Password" in Preferences
2. Check your email for the reset link
3. Click the link (should open app via deep link)
4. Enter new password in the app
5. Verify password is updated

### Security Audit Checklist

Before deploying to production, verify:

- [ ] Supabase redirect URLs configured correctly (`todoapp://auth/callback`, `todoapp://auth/password-reset`)
- [ ] Email templates use `{{ .RedirectTo }}` for custom redirects
- [ ] Row Level Security (RLS) policies enabled on all database tables
- [ ] Content Security Policy configured in `src-tauri/tauri.conf.json`
- [ ] Environment variables validated and not committed to git
- [ ] Rate limiting thresholds appropriate for your use case
- [ ] Deep link validation allowlists are restrictive
- [ ] CSRF state tokens generated for all auth flows
- [ ] Password reset flow tested end-to-end

### Security Best Practices

**For Developers:**
- Never disable security validations, even for debugging
- Always use the security utilities in `src/lib/security.ts`
- Log security events for auditing (validation failures, rate limit triggers)
- Keep security dependencies up to date
- Review Supabase security advisories regularly

**For Users:**
- Use strong, unique passwords
- Enable two-factor authentication in Supabase (if available)
- Don't share password reset links
- Report suspicious emails or deep links

## Database Security

This application implements comprehensive database-level security through Row Level Security (RLS) policies, constraints, and indexes. All database security measures are documented in [`supabase/README.md`](supabase/README.md).

### Row Level Security (RLS) Overview

RLS is the primary security mechanism that enforces user data isolation at the database level:

- **All database tables have RLS enabled** - No data can be accessed without passing through security policies
- **Policies enforce user isolation** - Users can only access their own data, enforced by `auth.uid() = user_id` checks
- **Database-level enforcement** - Even if client-side code is compromised, users cannot access other users' data
- **Anon key is safe** - The anon key is exposed to the client, but RLS policies restrict what it can access

**Why this matters:** Client-side filtering (e.g., `WHERE user_id = $1` in `src/App.tsx`) is defense-in-depth, not primary security. RLS ensures security even if the client is compromised.

### Tables and Policies

#### tasks Table

The `tasks` table stores user tasks with soft-delete support and late task tracking.

**RLS Policies:**
- **SELECT** (`tasks_select_own`): Users can only view their own tasks (`auth.uid() = user_id`)
- **INSERT** (`tasks_insert_own`): Users can only create tasks with their own `user_id`
- **UPDATE** (`tasks_update_own`): Users can only update their own tasks, cannot change `user_id`
- **DELETE** (`tasks_delete_own`): Users can only delete their own tasks

**Client-Side References:**
- `src/App.tsx` lines 39, 160, 201-202, 237-238 - All queries filter by `user_id` for defense-in-depth
- RLS policies are the primary security; client-side filtering is secondary

**Key Constraints:**
- `user_id` NOT NULL and foreign key to `auth.users` (prevents orphaned tasks)
- `name` length check (1-500 characters, prevents empty or excessively long names)
- `completed_at >= created_at` (prevents time paradoxes)
- `deleted_at >= created_at` (prevents time paradoxes)
- Unique constraint on `(user_id, name)` for active tasks (prevents duplicate task names)

#### user_preferences Table

The `user_preferences` table stores user UI preferences (theme and font).

**RLS Policies:**
- **SELECT** (`preferences_select_own`): Users can only view their own preferences
- **INSERT** (`preferences_insert_own`): Users can only create preferences with their own `user_id`
- **UPDATE** (`preferences_update_own`): Users can only update their own preferences
- **DELETE** (`preferences_delete_own`): Users can only delete their own preferences

**Client-Side References:**
- `src/components/Preferences.tsx` lines 27, 93, 116, 141 - UPSERT pattern with `user_id` filtering
- `user_id` is the primary key, ensuring one preference row per user

**Key Constraints:**
- `theme` must be 'light' or 'dark'
- `font` must be 'system', 'mono', or 'serif'
- `updated_at >= created_at`

### Database Constraints

Database constraints enforce data integrity and prevent invalid data:

**tasks Table Constraints:**
- **NOT NULL on user_id**: Every task must belong to a user (prevents orphaned tasks)
- **Foreign key to auth.users**: Ensures `user_id` references a valid user (CASCADE DELETE removes tasks when user is deleted)
- **Name length check**: `length(trim(name)) > 0 AND length(name) <= 500` (prevents empty or excessively long names)
- **Timestamp checks**: `completed_at >= created_at` and `deleted_at >= created_at` (prevents time paradoxes)
- **Business logic check**: `completed_at IS NULL OR deleted_at IS NOT NULL` (completed tasks must be soft-deleted)
- **Unique active task names**: `UNIQUE (user_id, name) WHERE deleted_at IS NULL` (prevents duplicate task names per user)

**user_preferences Table Constraints:**
- **Enum checks**: `theme IN ('light', 'dark')` and `font IN ('system', 'mono', 'serif')` (validates preference values)
- **Timestamp check**: `updated_at >= created_at` (ensures logical ordering)

### Database Indexes

Indexes optimize query performance and are critical for RLS policy enforcement:

**tasks Table Indexes:**
- **`idx_tasks_user_id`**: Speeds up user-specific queries (used in `src/App.tsx` line 36-40 `loadTasks()`)
- **`idx_tasks_user_active`**: Partial index for active tasks queries (used throughout `src/App.tsx`)
- **`idx_tasks_cleanup`**: Speeds up cleanup operations (used by `cleanup_tasks()` RPC function)
- **`idx_tasks_late`**: Speeds up late task marking (used by `mark_tasks_late()` RPC function)

**user_preferences Table Indexes:**
- **Primary key on user_id**: Provides automatic index (sufficient for single-row lookups)

**Performance Note:** Indexes on `user_id` ensure RLS policy checks (`auth.uid() = user_id`) are fast, even with large datasets.

### RPC Functions Security

The application uses two RPC (Remote Procedure Call) functions called from `src/App.tsx` (lines 66, 69, 118):

#### cleanup_tasks()

**Purpose:** Permanently delete tasks that have been soft-deleted for more than 48 hours

**Security Model:**
- Uses `SECURITY DEFINER` to run with elevated privileges (bypasses RLS for efficiency)
- **CRITICAL:** Filters by `auth.uid()` inside the function body to ensure user isolation
- Function body: `DELETE FROM tasks WHERE user_id = auth.uid() AND deleted_at < now() - interval '48 hours'`
- Only affects the calling user's tasks, cannot be exploited to access other users' data

**Called from:** `src/App.tsx` line 66, 118 (hourly cleanup)

#### mark_tasks_late()

**Purpose:** Mark tasks as late if they were created more than 24 hours ago and are still incomplete

**Security Model:**
- Uses `SECURITY DEFINER` with `auth.uid()` filtering
- Function body: `UPDATE tasks SET is_late = true WHERE user_id = auth.uid() AND created_at < now() - interval '24 hours' AND ...`
- Only affects the calling user's tasks

**Called from:** `src/App.tsx` line 69, 118 (hourly check)

**Why SECURITY DEFINER is safe:**
- Both functions explicitly filter by `auth.uid()` in their WHERE clauses
- Users can only affect their own data
- More efficient than `SECURITY INVOKER` for bulk operations
- Cannot be exploited to access other users' data

**Permissions:**
- Granted to `authenticated` role (only logged-in users can call)
- Revoked from `anon` role (anonymous users cannot call)

### Anon Key Permissions

The anon key is the public API key exposed to the client. It's safe to expose because RLS policies restrict what it can access.

**Allowed Operations (via RLS policies):**
- ✅ Read/write own tasks (enforced by `auth.uid() = user_id` in RLS policies)
- ✅ Read/write own preferences (enforced by `auth.uid() = user_id` in RLS policies)
- ✅ Call RPC functions (only affects own data due to `auth.uid()` filtering)
- ✅ Authenticate (sign up, sign in, sign out via Supabase Auth)

**Denied Operations (by RLS and Supabase):**
- ❌ Access other users' data (blocked by RLS `USING` clauses)
- ❌ Modify other users' data (blocked by RLS `WITH CHECK` clauses)
- ❌ Access `auth.users` table directly (blocked by Supabase)
- ❌ Execute arbitrary SQL (blocked by Supabase)
- ❌ Bypass RLS policies (only service role key can do this, which must never be exposed)
- ❌ Administrative operations (blocked by Supabase)

**Service Role Key Warning:** The service role key bypasses all RLS policies and must **NEVER** be exposed to the client. Only use it in secure backend environments.

### Database Setup

To set up the database with proper security:

**Initial Setup:**
1. Create a Supabase project at https://supabase.com/dashboard
2. Copy project URL and anon key to `.env` (see [Security & Configuration](#security--configuration))
3. Apply database migrations from `supabase/migrations/` directory
4. Verify RLS policies are enabled

**Applying Migrations:**

**Method 1: Supabase Dashboard (Recommended for first-time setup)**
1. Navigate to Supabase Dashboard > SQL Editor
2. Copy and execute each migration file in order:
   - `supabase/migrations/20250101000001_initial_schema.sql` - Creates tables, constraints, indexes
   - `supabase/migrations/20250101000002_enable_rls.sql` - Enables RLS and creates policies
   - `supabase/migrations/20250101000003_rpc_functions.sql` - Creates RPC functions
3. Verify no errors in the output

**Method 2: Supabase CLI (For ongoing development)**
```bash
# Install Supabase CLI
npm install -g supabase

# Login and link to your project
supabase login
supabase link --project-ref your-project-ref

# Push migrations to database
supabase db push
```

**Detailed Instructions:** See [`supabase/README.md`](supabase/README.md) for comprehensive setup instructions, schema documentation, and troubleshooting.

### Verifying Database Security

Use this checklist to verify database security is properly configured:

**Security Verification Checklist:**
- [ ] RLS enabled on all tables: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';` (should show `rowsecurity = true`)
- [ ] All tables have SELECT, INSERT, UPDATE, DELETE policies: `SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';` (should show 4 policies per table)
- [ ] Test that User A cannot read User B's data (use Supabase SQL Editor with different JWT tokens)
- [ ] Verify constraints prevent invalid data (try inserting empty task name, should fail)
- [ ] Verify indexes exist: `SELECT * FROM pg_indexes WHERE schemaname = 'public';` (should show all indexes from migration)
- [ ] Test RPC functions only affect calling user's data (see [`supabase/README.md`](supabase/README.md) for test queries)
- [ ] Verify anon key cannot access `auth.users` table (should fail with permission denied)
- [ ] Check Supabase logs for policy violations (Dashboard > Logs)

### Database Security Best Practices

**For Developers:**
- **Always rely on RLS policies as the primary security mechanism** - Client-side filtering is defense-in-depth, not primary security
- **Test with multiple user accounts** - Create at least 2 test accounts and verify User A cannot access User B's data
- **Never use the service role key in client-side code** - Only use the anon key in the client
- **Keep migrations in version control** - All schema changes must be in `supabase/migrations/` directory
- **Review Supabase audit logs regularly** - Monitor for unusual query patterns and policy violations

**For Production:**
- **Enable Supabase's built-in security features** - Configure rate limiting and IP allowlists (if applicable)
- **Monitor for unusual query patterns** - Set up alerts for policy violations and suspicious activity
- **Regularly review and update RLS policies** - Perform security audits before major releases
- **Perform security audits** - Test with penetration testing tools and review policies

### Troubleshooting Database Issues

**"permission denied for table tasks":**
- **Cause:** RLS is enabled but no policies exist
- **Solution:** Apply `supabase/migrations/20250101000002_enable_rls.sql` migration

**"new row violates row-level security policy":**
- **Cause:** WITH CHECK clause failed (trying to insert with wrong `user_id`)
- **Solution:** Ensure client sends correct `user_id` (should be `user.id` from auth context)

**"null value in column user_id violates not-null constraint":**
- **Cause:** Client not authenticated or not sending `user_id`
- **Solution:** Check that user is authenticated before database operations

**RPC functions not working:**
- **Cause:** Missing GRANT EXECUTE permissions
- **Solution:** Apply `supabase/migrations/20250101000003_rpc_functions.sql` migration

**Slow queries:**
- **Cause:** Missing indexes or inefficient query patterns
- **Solution:** Verify indexes exist, use `EXPLAIN ANALYZE` to identify slow queries

**For detailed troubleshooting:** See [`supabase/README.md`](supabase/README.md#troubleshooting)

### Additional Resources

- [Supabase Database Documentation](supabase/README.md) - Comprehensive database schema and security documentation
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security) - Official RLS guide
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security) - Official security guide
- [Security Policy](SECURITY.md) - Project security policy and vulnerability reporting

## Error Logging & Production Readiness

This application implements comprehensive error logging and production build optimization to ensure clean, secure, and observable production deployments.

### Logging System

**Centralized Logger Utility:**
- All logging is handled through `src/lib/logger.ts` for consistent, environment-aware behavior
- Development mode: Full console logging with formatting for debugging
- Production mode: Console statements stripped from bundle, errors sent to tracking service
- All application code uses the logger instead of direct console calls

**Logger API:**
```typescript
import { logger, getUserFriendlyMessage } from './lib/logger';

// Development-only debug logging
logger.debug('Component mounted', { props });

// Informational logging
logger.info('User action completed', { userId, action });

// Warning logging
logger.warn('Deprecated feature used', { feature });

// Error logging with sanitization
try {
  await riskyOperation();
} catch (error) {
  logger.error(error, { context: 'risky_operation', userId });
}

// User-friendly error messages
const message = getUserFriendlyMessage(error);
alert(message); // Shows user-friendly message, not technical details
```

### Error Boundaries

**React Error Boundary Implementation:**
- Implemented in `src/components/ErrorBoundary.tsx`
- Catches render-time errors and prevents app crashes
- Displays user-friendly fallback UI with recovery options
- Automatically logs errors to tracking service
- Wraps the entire application in `src/main.tsx`

**Features:**
- Custom fallback UI matching app styling
- "Try Again" button to reset error state
- Development mode shows technical details for debugging
- Production mode shows only generic user-friendly messages
- Automatic error tracking integration

### Production Build Configuration

**Vite Terser Configuration:**
- Production builds automatically strip all console statements
- Configured in `vite.config.ts` with environment-specific settings
- `drop_console: true` removes all console.log/error/warn/debug/info calls
- `drop_debugger: true` removes debugger statements
- Comments removed from production bundles for smaller size

**Build Optimization:**
```bash
# Standard production build
npm run build

# Build and verify no console statements leaked
npm run build:check

# Build and analyze bundle size
npm run build:analyze
```

**Source Maps:**
- Disabled for production (security and performance)
- Enabled for development (debugging support)
- Can be enabled for staging if needed

### Rust Logging

**Tauri Backend Logging:**
- Uses conditional compilation (`#[cfg(debug_assertions)]`)
- Debug logging only appears in debug builds
- Release builds have zero logging overhead
- All `println!` statements wrapped with `#[cfg(debug_assertions)]`

**Example:**
```rust
#[cfg(debug_assertions)]
println!("Menu setup complete");
```

**Future Enhancement:**
- Consider upgrading to `log` crate for advanced logging
- Integrate with Sentry's Rust SDK for production error tracking

### Error Tracking Integration (Optional)

**Sentry Integration Stub:**
- Logger is designed to integrate with Sentry or similar services
- Stub implementation in `src/lib/logger.ts` with integration instructions
- For Tauri + React, use `@sentry/react` for frontend and `tauri-plugin-sentry` for backend

**To integrate Sentry:**
1. Install dependencies:
   ```bash
   npm install @sentry/react @sentry/vite-plugin
   ```

2. Add to `vite.config.ts`:
   ```typescript
   import { sentryVitePlugin } from "@sentry/vite-plugin";
   plugins: [react(), sentryVitePlugin({ org: "...", project: "..." })]
   ```

3. Initialize in `main.tsx` before React render:
   ```typescript
   import * as Sentry from "@sentry/react";
   Sentry.init({ 
     dsn: "your-dsn-here", 
     environment: import.meta.env.MODE 
   });
   ```

4. For Tauri backend, add `tauri-plugin-sentry` to `Cargo.toml`

### Security Considerations

**Error Sanitization:**
- Stack traces never exposed in production
- Error messages sanitized to remove sensitive data
- User-friendly messages don't reveal system internals
- Context data logged for debugging but filtered for sensitive information

**What's Safe to Log:**
- User IDs (for debugging user-specific issues)
- Error types and codes
- Operation context (e.g., "sign_in", "load_tasks")
- Timestamps and request IDs

**What's Never Logged:**
- Passwords or password hashes
- Authentication tokens or session IDs
- API keys or secrets
- Personally Identifiable Information (PII)
- Full error stack traces in production

### Development vs Production

**Development Mode:**
- Full console logging enabled
- Detailed error messages with context
- Source maps available for debugging
- Error boundaries show technical details
- All logger methods output to console

**Production Mode:**
- All console statements stripped from bundle
- Errors logged to tracking service only
- User-friendly error messages only
- Error boundaries show generic recovery UI
- Stack traces never exposed to users

### Testing Error Handling

**Manual Testing:**
```bash
# Trigger errors in development to see logging behavior
# Test Error Boundary by throwing errors in components
# Verify production builds have no console output
# Check that user-friendly messages appear correctly
```

**Build Verification:**
```bash
# Run build verification script
npm run build:check

# Expected output:
# ✅ Production build verified: No console statements found
```

**Error Boundary Testing:**
- Throw errors in React components to test boundary
- Verify fallback UI appears correctly
- Test "Try Again" button resets error state
- Confirm errors are logged to tracking service

### Build Verification

**Automated Console Detection:**
- `scripts/check-build.js` scans production builds for console statements
- Fails the build if console statements are found
- Provides detailed output with file paths and line numbers
- Helps catch configuration issues early

**Usage:**
```bash
npm run build:check
```

**Integration:**
- Can be integrated into CI/CD pipeline
- Ensures production builds are clean
- Verifies terser configuration is working correctly

### For Developers

**Best Practices:**
- Always use `logger` instead of `console` for logging
- Provide context objects with error logs for debugging
- Use `getUserFriendlyMessage` for user-facing error displays
- Test error scenarios to ensure proper handling
- Never log sensitive data (passwords, tokens, PII)

**Code Examples:**
```typescript
// ✅ Good: Using logger with context
logger.error(error, { context: 'load_tasks', userId: user.id });

// ❌ Bad: Direct console usage
console.error('Failed to load tasks:', error);

// ✅ Good: User-friendly error messages
alert(getUserFriendlyMessage(error));

// ❌ Bad: Exposing technical details
alert(error.message);
```

### Build Verification Checklist

Before deploying to production:

- [ ] Run `npm run build:check` to verify no console statements
- [ ] Check bundle size with `npm run build:analyze`
- [ ] Verify error tracking integration works (if using Sentry)
- [ ] Test Error Boundary fallback UI in production mode
- [ ] Confirm user-friendly error messages display correctly
- [ ] Ensure no sensitive data is logged
- [ ] Verify source maps are disabled for production
- [ ] Test error scenarios end-to-end

### Future Enhancements

**Planned Improvements:**
- Integrate Sentry for production error tracking
- Add toast notifications for user-facing errors
- Implement retry logic for transient failures
- Add error analytics and monitoring dashboards
- Consider adding performance monitoring
- Implement structured logging with log levels
- Add error correlation IDs for debugging

**Reference:** See `src/lib/logger.ts` for detailed API usage and integration examples.

## IPC & Tauri Security

This application implements comprehensive security for Inter-Process Communication (IPC) between the Rust backend and TypeScript frontend.

### IPC Architecture

**Communication Pattern:**
- The application uses Tauri's event-based IPC (emit/listen pattern)
- Rust backend emits events to frontend via `window.emit()`
- TypeScript frontend listens to events via `listen()` from `@tauri-apps/api/event`
- No command-based IPC is currently used (the unused `sign_out` command was removed)

**Event Flow:**
1. User clicks menu item (e.g., "Sign Out" or "Preferences")
2. Rust menu handler validates event ID against allowlist
3. Rust emits event to "main" window only
4. TypeScript listener validates event source and payload
5. TypeScript executes action (e.g., calls `signOut()` or shows preferences)

### Tauri Capabilities System

**What are Capabilities?**
- Capabilities define what permissions each window has
- Configured in `src-tauri/capabilities/default.json`
- Follow the principle of least privilege
- Prevent unauthorized access to system resources

**Current Capabilities:**
- **Window Restriction**: Only the "main" window has capabilities (no wildcard permissions)
- **Event Permissions**: Can emit and listen to events (required for menu functionality)
- **Window Operations**: Can start dragging, show/hide, minimize/maximize
- **Dialog Access**: Can show native dialogs (for preferences and confirmations)

**Why This Matters:**
- Prevents malicious windows from accessing sensitive operations
- Limits attack surface for IPC-based exploits
- Ensures only trusted code can perform privileged operations

### Input Validation Layers

**Layer 1: Rust Backend Validation (`main.rs`)**

**Menu Event ID Validation:**
- All menu event IDs validated against allowlist: `["preferences", "sign_out"]`
- Invalid event IDs are rejected and logged
- Only the "main" window can receive events
- Prevents processing of crafted or unexpected menu IDs

**Implementation:**
- Allowlist defined as constant in Rust code
- Validation function checks event ID before processing
- Graceful error handling prevents information leakage

**Layer 2: TypeScript Frontend Validation (`App.tsx`)**

**Event Source Validation:**
- Verifies events came from the "main" window
- Checks event payload structure and type
- Validates event names against allowlist
- Rejects events from unexpected sources

**Event Payload Validation:**
- Type-safe event handlers using TypeScript interfaces
- Validates payload structure even when empty
- Prevents injection attacks via crafted payloads

**Rate Limiting:**
- Events are rate-limited to prevent abuse
- Maximum one event per second per event type
- Prevents UI spam and DoS attacks
- Logs rate limit violations for security monitoring

**Layer 3: Application Logic Validation**

**Sign-Out Event:**
- Validates user is authenticated before signing out
- Logs sign-out events for audit trail
- Clears all user data and session state
- Reference: `src/App.tsx` lines 151-182

**Preferences Event:**
- Validates preferences modal isn't already shown
- Prevents duplicate modal instances
- Logs preferences access for audit trail
- Reference: `src/App.tsx` lines 187-221

### Allowed Events

The application uses a strict allowlist of IPC events:

**1. `sign-out-user`**
- **Purpose**: Triggered when user clicks "Sign Out" in menu
- **Emitted by**: Rust menu handler (`main.rs` line 172)
- **Listened by**: Main app component (`App.tsx` line 151)
- **Payload**: Empty (no data transmitted)
- **Action**: Calls `signOut()` from AuthContext
- **Security**: Validated on both Rust and TypeScript sides

**2. `navigate-to-preferences`**
- **Purpose**: Triggered when user clicks "Preferences" in menu
- **Emitted by**: Rust menu handler (`main.rs` line 155)
- **Listened by**: Main app component (`App.tsx` line 187)
- **Payload**: Empty (no data transmitted)
- **Action**: Shows preferences modal via `setShowPreferences(true)`
- **Security**: Validated on both Rust and TypeScript sides

**Adding New Events:**
If you need to add new IPC events:
1. Add event name to Rust allowlist in `main.rs`
2. Add event name to TypeScript allowlist in `App.tsx`
3. Document the event in this README
4. Update `src-tauri/capabilities/default.md` with security implications
5. Add validation for event payload structure
6. Test that unauthorized events are rejected

### Command Allowlist

**Current Status:**
- No Tauri commands are currently used
- The unused `sign_out` command was removed in favor of event-based IPC
- All IPC uses the event pattern (emit/listen)

**Why Events Instead of Commands?**
- Events are simpler for one-way communication (backend → frontend)
- Commands are better for request/response patterns (frontend → backend)
- Current use cases (menu actions) don't require responses
- Events provide sufficient security with proper validation

**If Commands Are Needed in the Future:**
1. Define command in Rust with `#[tauri::command]` attribute
2. Add to `invoke_handler` in `main.rs`
3. Add to capabilities allowlist in `default.json`
4. Implement input validation in command handler
5. Document command in this README and `default.md`
6. Test that non-allowed commands are rejected

### Security Best Practices

**For Developers:**

**When Adding IPC Events:**
- Always validate event IDs on both Rust and TypeScript sides
- Use TypeScript interfaces for type-safe event payloads
- Add events to allowlists in both Rust and TypeScript
- Document the event's purpose and security implications
- Test that invalid events are rejected
- Log security-relevant events for audit trail

**When Adding Tauri Commands:**
- Validate all input parameters in the Rust command handler
- Use strong typing for command parameters
- Add command to capabilities allowlist
- Implement rate limiting if command can be abused
- Return minimal data (don't expose sensitive information)
- Log command invocations for audit trail

**When Modifying Capabilities:**
- Follow the principle of least privilege
- Only grant permissions actually needed
- Document why each permission is required
- Test that removing the permission breaks expected functionality
- Review security implications with the team
- Update `default.md` documentation

### Testing IPC Security

**Manual Testing:**

**Test Event Validation:**
```typescript
// In browser console (development mode)
// Try to emit an unauthorized event (should be rejected)
window.__TAURI__.event.emit('malicious-event', {});

// Try to emit an allowed event with invalid payload (should be rejected)
window.__TAURI__.event.emit('sign-out-user', { malicious: 'data' });
```

**Test Rate Limiting:**
- Click "Sign Out" menu item rapidly (should be rate limited after first click)
- Click "Preferences" menu item rapidly (should be rate limited)
- Verify rate limit violations are logged

**Test Window Restrictions:**
- Try to open a new window and emit events from it (should fail)
- Verify only the "main" window can emit/listen to events

**Automated Testing:**
- Consider adding integration tests for IPC security
- Test that invalid events are rejected
- Test that rate limiting works correctly
- Test that window restrictions are enforced

### Security Audit Checklist

Before deploying to production, verify:

- [ ] All IPC events are in the allowlist (Rust and TypeScript)
- [ ] Event payloads are validated on both sides
- [ ] Rate limiting is enabled for all events
- [ ] Window restrictions are enforced (no wildcard permissions)
- [ ] Capabilities follow principle of least privilege
- [ ] All commands are in the allowlist (if any commands exist)
- [ ] Input validation is performed in command handlers
- [ ] Security events are logged for audit trail
- [ ] Documentation is up to date (`README.md`, `default.md`)
- [ ] IPC security has been tested manually and automatically

### Threat Model

**What We're Protecting Against:**

**1. Malicious IPC Injection:**
- **Threat**: Attacker tries to emit crafted events to trigger unintended actions
- **Mitigation**: Event ID allowlists, payload validation, source validation

**2. Privilege Escalation:**
- **Threat**: Malicious window tries to access capabilities it shouldn't have
- **Mitigation**: Window restrictions in capabilities, no wildcard permissions

**3. DoS via IPC Spam:**
- **Threat**: Attacker floods IPC channel with events to crash or slow down app
- **Mitigation**: Rate limiting, event validation, graceful error handling

**4. Information Disclosure:**
- **Threat**: Attacker tries to extract sensitive data via IPC responses
- **Mitigation**: Minimal data in event payloads, no sensitive data in events

**5. Command Injection:**
- **Threat**: Attacker tries to execute arbitrary commands via IPC
- **Mitigation**: Command allowlist, input validation, no dynamic command execution

### Troubleshooting IPC Issues

**"Event not received in frontend":**
- Check that event name is in both Rust and TypeScript allowlists
- Verify event is emitted to the correct window ("main")
- Check browser console for validation errors
- Ensure event listener is set up before event is emitted

**"Permission denied" errors:**
- Check that the required permission is in `default.json`
- Verify the window has the capability assigned
- Review Tauri logs for detailed permission errors

**"Rate limit exceeded":**
- This is expected behavior for rapid event triggers
- Wait for rate limit window to expire (1 second)
- Check if rate limiting is too aggressive for your use case

### References

- [Tauri Capabilities Documentation](https://tauri.app/v2/reference/capabilities/)
- [Tauri IPC Security Guide](https://tauri.app/v2/security/)
- [Project Security Policy](SECURITY.md)
- [Capabilities Documentation](src-tauri/capabilities/default.md)
- [Rust Backend Code](src-tauri/src/main.rs)
- [TypeScript Frontend Code](src/App.tsx)

## Dependency Management & Security

This application implements comprehensive dependency security management with automated scanning and clear update processes.

### Automated Dependency Scanning

**GitHub Actions Workflows:**

Two workflows run automatically to ensure dependency security:

1. **Dependency Security Scanning** (`.github/workflows/dependency-scanning.yml`)
   - **Triggers**: Push to main, pull requests, weekly (Mondays 06:00 UTC)
   - **Scans**:
     - npm dependencies (`npm audit`)
     - Rust dependencies (`cargo audit`)
     - Filesystem scan with Trivy (SARIF reporting)
     - Dependency review on pull requests
   - **Results**: Visible in GitHub Security > Code scanning alerts

2. **Security Checks** (`.github/workflows/security-checks.yml`)
   - **Triggers**: Push to main, pull requests
   - **Validates**: Environment config, secret management, build security

**Viewing Results:**
- Navigate to: Repository > Security > Code scanning alerts
- Filter by: Tool (Trivy), Severity (High, Critical)
- Each alert includes: CVE details, affected package, remediation steps

### Local Dependency Auditing

**Quick Commands:**

```bash
# Audit all dependencies (npm + Rust)
npm run audit:all

# Audit npm dependencies only
npm run audit:npm

# Audit Rust dependencies only
npm run audit:cargo

# Safely fix npm vulnerabilities (non-breaking)
npm run audit:fix

# Check for outdated dependencies
npm run deps:outdated

# Update dependencies within semver ranges
npm run deps:update

# Run all security checks
npm run security:check
```

**Before Every Release:**
```bash
# Comprehensive security check
npm run security:check

# This runs:
# - Secret leak detection
# - Environment validation
# - npm audit
# - cargo audit
```

### Dependency Update Process

**For npm Dependencies:**

1. **Check for updates:**
   ```bash
   npm outdated
   ```

2. **Review changelogs** for breaking changes

3. **Update package:**
   ```bash
   # Safe: Update within semver range
   npm update package-name
   
   # Specific version
   npm install package-name@version
   
   # Latest (may break)
   npm install package-name@latest
   ```

4. **Test thoroughly:**
   ```bash
   npm run lint
   npm run build
   npm run tauri dev
   ```

5. **Commit with lock file:**
   ```bash
   git add package.json package-lock.json
   git commit -m "chore(deps): update package-name to vX.Y.Z"
   ```

**For Rust Dependencies:**

1. **Check for updates:**
   ```bash
   cd src-tauri
   cargo outdated  # Install: cargo install cargo-outdated
   ```

2. **Update Cargo.toml** with new versions

3. **Update lock file:**
   ```bash
   cargo update
   ```

4. **Test build:**
   ```bash
   cargo build --release
   ```

5. **Commit changes:**
   ```bash
   git add Cargo.toml Cargo.lock
   git commit -m "chore(deps): update rust-package to vX.Y.Z"
   ```

### Handling Security Vulnerabilities

**Response Timeline:**
- **Critical**: Patch within 24 hours
- **High**: Patch within 48 hours
- **Moderate**: Patch within 1 week
- **Low**: Patch in next regular update cycle

**Response Steps:**

1. **Assess severity** and exploitability
2. **Create hotfix branch** for critical/high issues
3. **Update vulnerable dependency**
4. **Test thoroughly** (even if urgent)
5. **Create PR** with "[SECURITY]" prefix
6. **Fast-track review** and merge
7. **Document** in SECURITY.md

**For Vulnerable Subdependencies:**

Use npm overrides in `package.json`:

```json
{
  "overrides": {
    "vulnerable-package": "^patched-version"
  }
}
```

Document why the override is needed and track removal when the parent package updates.

### CI/CD Failure Thresholds

**What Blocks CI:**
- npm audit: `high` or `critical` severity
- cargo audit: Any vulnerability
- Dependency review: `high` or `critical` in PR changes

**What Doesn't Block CI:**
- `moderate` and `low` severity vulnerabilities
- These are tracked but allow time for proper testing

### Lock File Management

**Best Practices:**

✅ **Always commit lock files:**
- `package-lock.json` (npm)
- `Cargo.lock` (Rust)
- Ensures reproducible builds
- Critical for security

✅ **Use `npm ci` in CI/CD:**
- Enforces lock file (fails if out of sync)
- Faster than `npm install` 
- Deterministic installs

❌ **Never manually edit lock files:**
- Use `npm install` or `cargo update` to regenerate

**Resolving Lock File Conflicts:**
```bash
# For npm
npm install  # Regenerates lock file

# For Cargo
cargo update  # Regenerates lock file
```

### Supply Chain Security

**Before Adding New Dependencies:**

1. **Vet the package:**
   - Check npm downloads / GitHub stars
   - Review maintainer reputation
   - Check for recent activity (not abandoned)
   - Review security history
   - Read open issues

2. **Minimize dependencies:**
   - Only add when necessary
   - Prefer standard library solutions
   - Regularly audit and remove unused deps

3. **Pin critical versions:**
   - Use exact versions for security-critical packages
   - Use semver ranges for others

### Subresource Integrity (SRI)

**Current Status:**
- SRI is **not currently implemented**
- The app bundles all assets locally (no external CDN resources)
- CSP already restricts resource loading to trusted origins

**When to Implement SRI:**

If you add external resources (fonts, scripts from CDNs):

1. **Install SRI plugin:**
   ```bash
   npm install --save-dev vite-plugin-sri3
   ```

2. **Configure in `vite.config.ts`:**
   ```typescript
   import sri from 'vite-plugin-sri3';
   
   export default defineConfig({
     plugins: [react(), sri()]
   });
   ```

3. **For external CDN resources**, manually add integrity:
   ```html
   <link
     href="https://fonts.googleapis.com/css2?family=Inter"
     rel="stylesheet"
     integrity="sha384-..."
     crossorigin="anonymous"
   />
   ```

4. **Generate integrity hashes:**
   ```bash
   curl -s https://example.com/resource.js | \
     openssl dgst -sha384 -binary | \
     openssl base64 -A
   ```

**Why Not Implemented Now:**
- No external resources currently used
- All assets bundled by Vite
- CSP provides sufficient protection
- Would add unnecessary build complexity

See `vite.config.ts` for detailed SRI implementation documentation.

### Security Headers

**Configured in `src-tauri/tauri.conf.json`:**

**Content Security Policy (CSP):**
- Strict CSP with Supabase whitelist
- Separate dev and production policies
- Prevents XSS and unauthorized resource loading

**Additional Security Headers:**
- `Cross-Origin-Opener-Policy: same-origin` 
- `Cross-Origin-Embedder-Policy: require-corp` 
- `Cross-Origin-Resource-Policy: same-origin` 
- `X-Content-Type-Options: nosniff` 
- `Permissions-Policy`: Denies camera, microphone, geolocation, payment, USB

**Why These Headers:**
- COOP/COEP/CORP: Isolate browsing context, prevent side-channel attacks
- X-Content-Type-Options: Prevent MIME sniffing attacks
- Permissions-Policy: Deny unnecessary browser features

**Note:** Tauri applies these headers to all webview requests. They complement the CSP configuration.

### Dependency Security Checklist

Before every release:

- [ ] Run `npm run audit:all` locally
- [ ] Review GitHub Security > Code scanning alerts
- [ ] Check for outdated dependencies
- [ ] Review and merge pending Dependabot PRs
- [ ] Verify lock files are committed
- [ ] Test application after updates
- [ ] Document any overrides or workarounds
- [ ] Update SECURITY.md if policies change

### Tools and Resources

**Installed Tools:**
- `npm audit` (built-in)
- `cargo-audit` (install: `cargo install cargo-audit --locked`)
- `cargo-outdated` (optional: `cargo install cargo-outdated`)

**GitHub Actions:**
- Trivy (SARIF vulnerability scanning)
- Dependency Review (PR-time checks)

**External Resources:**
- [npm Security Best Practices](https://docs.npmjs.com/auditing-package-dependencies-for-security-vulnerabilities)
- [RustSec Advisory Database](https://rustsec.org/)
- [GitHub Dependency Review](https://docs.github.com/en/code-security/supply-chain-security)
- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)

### Troubleshooting

**"npm audit" fails with high severity:**
- Run `npm audit fix` to apply safe updates
- Review `npm audit` output for manual fixes
- Use overrides for vulnerable subdependencies
- Document any unfixable vulnerabilities

**"cargo audit" fails:**
- Update vulnerable crate in `Cargo.toml` 
- Run `cargo update` to regenerate lock file
- Check RustSec advisory for details
- Consider alternative crates if no fix available

**CI fails on dependency review:**
- Review the PR's dependency changes
- Check GitHub Security alerts for details
- Update vulnerable dependencies before merging
- Document any exceptions in PR description

**Lock file conflicts:**
- Never manually resolve lock file conflicts
- Regenerate with `npm install` or `cargo update` 
- Commit the regenerated lock file

## Security Testing

Comprehensive security testing documentation is available to validate all implemented security measures.

**Latest Test Results (2025-01-13):** All security tests passed successfully with no vulnerabilities found. View detailed execution logs in [`docs/test-results/`](docs/test-results/).

### Testing Documentation

We maintain detailed security testing procedures in the `docs/` directory:

**Master Guide:**
- [`docs/SECURITY_TESTING.md`](docs/SECURITY_TESTING.md) - Entry point for all security testing, test environment setup, and execution tracking

**Detailed Test Procedures:**
- [`docs/PENETRATION_TESTING.md`](docs/PENETRATION_TESTING.md) - Manual penetration testing for XSS, CSRF, SQL injection, and authentication bypass
- [`docs/DEEP_LINK_TESTING.md`](docs/DEEP_LINK_TESTING.md) - Deep-link security testing with malicious URL test cases
- [`docs/RLS_TESTING.md`](docs/RLS_TESTING.md) - Row Level Security policy verification with multi-user scenarios
- [`docs/SESSION_TESTING.md`](docs/SESSION_TESTING.md) - Session management and token handling test procedures

**Pre-Release Checklist:**
- [`docs/SECURITY_CHECKLIST.md`](docs/SECURITY_CHECKLIST.md) - Comprehensive pre-release security checklist (150+ items)

### Quick Security Validation

Before each release, run these quick checks:

```bash
# Run all security checks
npm run security:check

# This includes:
# - Environment variable validation
# - Secret leak detection
# - npm dependency audit
# - cargo dependency audit
# - Build verification
```

### Testing Coverage

Our security testing covers:

**1. Penetration Testing (20+ test cases)**
- XSS: Stored, reflected, and DOM-based
- CSRF: State token validation, expiry, reuse prevention
- SQL Injection: Task names, RLS bypass attempts
- Auth Bypass: Unauthenticated access, rate limiting, session hijacking
- Authorization: Horizontal and vertical privilege escalation

**2. Deep-Link Security (15+ test cases)**
- Scheme, host, path, and parameter validation
- URL length limits and duplicate parameters
- XSS and SQL injection in parameters
- Path traversal attacks
- State token security

**3. RLS Policy Verification (10+ test cases)**
- Multi-user scenarios (User A cannot access User B's data)
- SELECT, INSERT, UPDATE, DELETE policies for all tables
- Unauthenticated access blocking
- RPC function security (cleanup_tasks, mark_tasks_late)

**4. Session Management (20+ test cases)**
- Token storage, format, and expiry
- Automatic token refresh
- Session lifecycle (sign in, sign out, persistence)
- Multi-session and session isolation
- Rate limiting integration

### Test Execution Schedule

**Before Each Release:**
- Complete [`docs/SECURITY_CHECKLIST.md`](docs/SECURITY_CHECKLIST.md)
- Execute critical penetration tests
- Verify RLS policies with multi-user testing
- Run all automated security checks

**Weekly (Automated):**
- Dependency scanning via GitHub Actions
- Security checks workflow
- Dependabot PRs reviewed

**Monthly:**
- Manual penetration testing spot checks
- Review security documentation for updates
- Check for new attack vectors or vulnerabilities

**Quarterly:**
- Comprehensive penetration testing
- Full security checklist execution
- Security training and awareness

**Annually:**
- External security audit (recommended)
- Review and update all security procedures
- Assess new security technologies and practices

### Running Security Tests

**Manual Testing:**

1. **Set up test environment:**
   - Create multiple test user accounts (User A, User B, User C)
   - Prepare test data
   - Open browser DevTools

2. **Execute test procedures:**
   - Follow step-by-step instructions in each testing document
   - Record results in test execution logs
   - Document any findings

3. **Review and remediate:**
   - Analyze test results
   - Prioritize findings by severity
   - Implement fixes
   - Re-test to verify fixes

**Automated Testing:**

```bash
# Dependency audits
npm run audit:all

# Build verification
npm run build:check

# Environment validation
npm run validate-env

# Secret leak detection
npm run check-secrets
```

### Test Results and Findings

**Recording Test Results:**
- Use test execution log templates provided in each testing document
- Store completed logs in `docs/test-results/` (create directory as needed)
- Include: test date, tester name, environment, results summary, findings

**Tracking Findings:**
- Create GitHub issues for security findings
- Label with severity: Critical, High, Medium, Low
- Assign to appropriate team member
- Track remediation progress
- Re-test after fixes

**Reporting:**
- Update `SECURITY.md` Security Audit History table
- Document findings and remediations
- Share learnings with team
- Update testing procedures based on findings

### Security Testing Best Practices

**For Testers:**
- Follow test procedures exactly as documented
- Record all observations, even if tests pass
- Don't skip tests due to time pressure
- Report findings immediately (especially critical/high)
- Verify fixes before closing findings

**For Developers:**
- Review security testing docs before implementing features
- Consider security implications of all changes
- Add new test cases for new features
- Fix security findings before feature work
- Participate in security testing

**For Security Lead:**
- Review all test results before releases
- Approve security checklist sign-off
- Prioritize security findings
- Update testing procedures as needed
- Coordinate external audits

### Continuous Improvement

Security testing procedures are living documents:
- Update when new features are added
- Enhance based on findings and incidents
- Incorporate new attack vectors as discovered
- Align with evolving security best practices
- Integrate feedback from external audits

### Resources

**Internal:**
- [SECURITY.md](SECURITY.md) - Security policy and architecture
- [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) - Security checklist for PRs
- [supabase/README.md](supabase/README.md) - Database security documentation

**External:**
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [Tauri Security Documentation](https://tauri.app/v1/guides/security/)

For questions about security testing, refer to the testing documentation or contact the security lead.

This section provides clear guidance on security testing procedures and ensures ongoing security validation.

## Development

**Before starting development, complete the [Security & Configuration](#security--configuration) setup above.**

```bash
# Install dependencies
npm install

# Run development server
npm run tauri dev

# Build for production
npm run tauri build
```

## Project Structure

```
todo-app/
├── src/
│   ├── App.tsx          # Main application logic
│   ├── styles.css       # Minimalist styling with animations
│   └── main.tsx         # React entry point
├── src-tauri/
│   ├── src/main.rs      # Tauri backend
│   ├── Cargo.toml       # Rust dependencies
│   └── tauri.conf.json  # App configuration
└── package.json
```

## How It Works

1. **Task Creation**: Press Cmd+N to create a new task
2. **Task Completion**: Click the checkbox to mark as complete
3. **Undo**: Accidentally completed? Press Cmd+Z to restore
4. **Automatic Cleanup**:
   - After 24 hours: Uncompleted tasks are marked as "late"
   - After 48 hours: Completed tasks are permanently removed
5. **Persistence**: All data stored locally in app data directory

## License

MIT
