# Pull Request

## Description

<!-- Provide a brief description of the changes in this PR -->

**What changes does this PR introduce?**


**Why are these changes needed?**


**Related issues or tickets:**
<!-- Link to related issues, e.g., Fixes #123 -->


## Type of Change

<!-- Check all that apply -->

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Database schema change (requires migration)
- [ ] IPC/Tauri security change
- [ ] Security enhancement
- [ ] Dependency update (security or maintenance)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)

## Database Changes Checklist

<!-- Only complete this section if this PR includes database changes -->

- [ ] New migration file created in `supabase/migrations/` with timestamp prefix (format: `YYYYMMDDHHMMSS_description.sql`)
- [ ] Migration includes RLS policies for new tables
- [ ] Migration includes appropriate indexes for query performance
- [ ] Migration includes constraints (NOT NULL, CHECK, UNIQUE, FOREIGN KEY)
- [ ] Migration tested in development environment (no errors)
- [ ] `supabase/README.md` updated with new schema documentation
- [ ] RLS policies tested with multiple user accounts (User A cannot access User B's data)
- [ ] Migration includes SQL comments explaining purpose and security model

## Security Checklist

<!-- Review all security considerations -->

- [ ] All database queries filter by `user_id` (if applicable)
- [ ] No secrets or credentials committed (checked with `npm run check-secrets`)
- [ ] Environment variables properly validated (checked with `npm run validate-env`)
- [ ] RLS policies prevent unauthorized access (tested with multiple users)
- [ ] Input validation added for user-provided data
- [ ] Rate limiting considered (if adding new auth flows)
- [ ] CSRF protection added (if adding new state-changing operations)
- [ ] Deep link validation added (if adding new deep link handlers)
- [ ] No service role key exposed to client (only anon key used)
- [ ] Security implications documented in code comments

**IPC & Tauri Security:**
- [ ] New IPC events added to allowlists (Rust and TypeScript)
- [ ] Event payloads validated on both backend and frontend
- [ ] Event source (window label) validated
- [ ] Rate limiting implemented for new events
- [ ] Tauri capabilities follow principle of least privilege
- [ ] No wildcard window permissions added
- [ ] New commands added to allowlist (if applicable)
- [ ] Command input parameters validated in Rust
- [ ] IPC security implications documented in `default.md`
- [ ] Tested that unauthorized events/commands are rejected

## Dependency Changes Checklist

<!-- Only complete this section if this PR includes dependency updates -->

**npm Dependencies:**
- [ ] Ran `npm audit` and no high/critical vulnerabilities introduced
- [ ] Reviewed changelogs for breaking changes
- [ ] Updated `package.json` and committed `package-lock.json` 
- [ ] Tested application with new dependency versions
- [ ] Documented any breaking changes in PR description
- [ ] Verified no unexpected transitive dependency changes

**Rust Dependencies:**
- [ ] Ran `cargo audit` and no vulnerabilities introduced
- [ ] Reviewed changelogs for breaking changes
- [ ] Updated `Cargo.toml` and committed `Cargo.lock` 
- [ ] Tested Tauri build with new dependency versions
- [ ] Verified no compilation errors or warnings

**Dependency Overrides:**
- [ ] Documented reason for any npm overrides in `package.json` 
- [ ] Created tracking issue for removing override when possible
- [ ] Referenced CVE or advisory number in override comment

**Security Vulnerabilities:**
- [ ] If fixing a security vulnerability, referenced CVE number
- [ ] Documented vulnerability details in PR description
- [ ] Tested that vulnerability is actually fixed
- [ ] Updated SECURITY.md with incident details (if applicable)
- [ ] Added "[SECURITY]" prefix to PR title (if applicable)

**Supply Chain Security:**
- [ ] Vetted new dependencies (popularity, maintainer, activity)
- [ ] Verified package authenticity (not typosquatting)
- [ ] Reviewed package permissions and postinstall scripts
- [ ] Minimized dependency count (only added if necessary)

## Code Quality Checklist

- [ ] Code follows project conventions and style guide
- [ ] TypeScript types are properly defined (no `any` types without justification)
- [ ] Error handling is comprehensive (try/catch blocks, error messages)
- [ ] Console.log statements removed or replaced with proper logging
- [ ] Comments added for complex logic
- [ ] README updated (if user-facing changes)
- [ ] No linting errors (`npm run lint` passes)
- [ ] Build succeeds (`npm run build` passes)

## Testing

<!-- Describe how you tested these changes -->

- [ ] Tested locally in development mode (`npm run tauri dev`)
- [ ] Tested with multiple user accounts (if applicable)
- [ ] Tested edge cases and error scenarios
- [ ] Verified no regressions in existing functionality
- [ ] Tested on target platform(s): <!-- e.g., macOS, Windows, Linux -->

**Test scenarios covered:**
<!-- List specific test scenarios you verified -->
1. 
2. 
3. 

## Documentation

- [ ] README.md updated (if needed)
- [ ] `supabase/README.md` updated (if database changes)
- [ ] `src-tauri/capabilities/default.md` updated (if IPC changes)
- [ ] Code comments added for complex logic
- [ ] Security implications documented
- [ ] Migration history table updated (if database changes)

## Deployment Notes

<!-- Any special steps required for deployment? -->

**Database migrations to apply:**
<!-- List migration files in order, e.g., -->
<!-- - `supabase/migrations/20250101000004_add_tags_table.sql` -->


**Environment variables to add/update:**
<!-- List any new or changed environment variables -->


**Supabase configuration changes needed:**
<!-- e.g., Add new redirect URL, update email templates, etc. -->


**Other deployment considerations:**
<!-- Any other steps or considerations for deployment -->


## Screenshots / Videos

<!-- If applicable, add screenshots or videos to demonstrate the changes -->


## Checklist Before Requesting Review

- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings or errors
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published in downstream modules
- [ ] I have checked my code and corrected any misspellings
- [ ] I have run `npm run security:check` and it passes

## Additional Notes

<!-- Any additional information that reviewers should know -->


---

**For Reviewers:**

Please verify:
- [ ] Security checklist items are properly addressed
- [ ] Database changes include proper RLS policies and constraints
- [ ] Code follows project conventions
- [ ] Tests adequately cover the changes
- [ ] Documentation is clear and complete
