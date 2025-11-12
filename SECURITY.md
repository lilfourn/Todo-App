# Security Policy

## Overview

This document outlines the security policy for the Todo App, including how to report vulnerabilities, our security architecture, implemented security features, known limitations, and best practices for contributors.

**Last Updated:** 2025-01-01

**Commitment:** We take security seriously and are committed to protecting user data and maintaining a secure application. This policy applies to all versions of the Todo App.

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          | Notes |
| ------- | ------------------ | ----- |
| Latest (main branch) | :white_check_mark: | Active development, receives all security updates |
| Previous releases | :x: | No longer supported, please upgrade to latest |

**End-of-Life Policy:** Only the latest version on the main branch receives security updates. Users should always run the latest version to ensure they have all security patches.

## Reporting a Vulnerability

We appreciate responsible disclosure of security vulnerabilities. If you discover a security issue, please follow these steps:

### How to Report

**Preferred Method: GitHub Security Advisories**
1. Go to the repository's Security tab
2. Click "Report a vulnerability"
3. Fill out the security advisory form with details
4. Submit the report (visible only to maintainers)

**Alternative Method: Email**
- Send an email to: [security@your-domain.com] <!-- Update with actual security contact -->
- Subject line: "Security Vulnerability Report - Todo App"
- Include details as outlined below

### What to Include in Your Report

Please provide as much information as possible:

- **Description:** Clear description of the vulnerability
- **Impact:** What an attacker could achieve by exploiting this vulnerability
- **Steps to Reproduce:** Detailed steps to reproduce the issue
- **Proof of Concept:** Code, screenshots, or videos demonstrating the vulnerability
- **Affected Versions:** Which versions are affected (if known)
- **Suggested Fix:** If you have ideas for how to fix it (optional)
- **Your Contact Information:** How we can reach you for follow-up

### What to Expect

- **Acknowledgment:** We will acknowledge receipt of your report within 48 hours
- **Initial Assessment:** We will provide an initial assessment within 5 business days
- **Updates:** We will keep you informed of our progress
- **Resolution:** We aim to resolve critical vulnerabilities within 30 days
- **Credit:** We will credit you in the security advisory (unless you prefer to remain anonymous)

### Disclosure Policy

We follow **responsible disclosure**:

1. **Private Disclosure:** Report the vulnerability privately (not publicly)
2. **Coordinated Disclosure:** We will work with you to understand and fix the issue
3. **Public Disclosure:** We will publicly disclose the vulnerability after a fix is released
4. **Credit:** We will credit the reporter in the public disclosure (if desired)

**Please do not:**
- Publicly disclose the vulnerability before we have released a fix
- Exploit the vulnerability beyond what is necessary to demonstrate it
- Access, modify, or delete other users' data
- Perform denial-of-service attacks

## Security Architecture

The Todo App implements a multi-layered security architecture:

### 1. Client-Side Security

**Content Security Policy (CSP):**
- Strict CSP configured in `src-tauri/tauri.conf.json`
- Whitelists only trusted domains (Supabase, Tauri protocols)
- Prevents XSS attacks and unauthorized resource loading

**Deep Link Validation:**
- All incoming deep links validated against strict criteria
- Scheme validation (only `todoapp://` protocol)
- Host validation (only `auth` host)
- Path allowlist (`/callback`, `/password-reset`)
- Parameter validation and length limits
- Implemented in `src/lib/security.ts`

**Rate Limiting:**
- Client-side rate limiting for authentication attempts
- 5 attempts per 15 minutes per email address
- Exponential backoff for repeated failures
- Prevents brute force attacks
- Implemented in `src/lib/security.ts` (RateLimiter class)

**CSRF Protection:**
- State tokens for all authentication flows
- Cryptographically secure random tokens (32 bytes)
- Token validation with 5-minute TTL
- Stored in localStorage with timestamps
- Implemented in `src/lib/security.ts`

### 2. Database Security

**Row Level Security (RLS):**
- Enabled on all database tables
- Policies enforce user isolation (`auth.uid() = user_id`)
- Database-level enforcement (cannot be bypassed by client)
- Documented in `supabase/migrations/20250101000002_enable_rls.sql`

**Database Constraints:**
- NOT NULL constraints prevent missing data
- Foreign keys ensure referential integrity
- CHECK constraints validate data formats
- Unique constraints prevent duplicates
- Documented in `supabase/migrations/20250101000001_initial_schema.sql`

**Database Indexes:**
- Optimize query performance
- Critical for RLS policy enforcement
- Partial indexes for common query patterns
- Documented in `supabase/migrations/20250101000001_initial_schema.sql`

**RPC Functions:**
- Use SECURITY DEFINER with `auth.uid()` filtering
- Only affect calling user's data
- Cannot be exploited for privilege escalation
- Documented in `supabase/migrations/20250101000003_rpc_functions.sql`

### 3. Authentication Security

**Supabase Auth:**
- Industry-standard JWT-based authentication
- Secure session management
- Email confirmation for new accounts
- Password reset via secure deep links

**Session Management:**
- JWT tokens stored securely
- Automatic session refresh
- Session expiry enforcement

**Password Reset:**
- Uses Tauri deep link protocol (not web URLs)
- CSRF protection via state tokens
- Single-use reset tokens (1-hour expiry)
- In-app password entry (not on web page)

### 4. IPC Security (Inter-Process Communication)

**Event-Based IPC:**
- Rust backend communicates with TypeScript frontend via events
- Allowlist validation: All event IDs validated against allowlists on both sides
- Window restrictions: Only the "main" window has IPC capabilities
- Payload validation: Event payloads validated for type and structure
- Rate limiting: IPC events rate-limited to prevent abuse
- No wildcard permissions: Capabilities explicitly granted per window

**Tauri Capabilities:**
- Configured in `src-tauri/capabilities/default.json`
- Follow principle of least privilege
- Window-level permission restrictions
- Event allowlists (Rust and TypeScript)
- Documented in `src-tauri/capabilities/default.md`

### 5. Secret Management

**Environment Variables:**
- All secrets stored in `.env` file (gitignored)
- Validation script checks format and presence
- Git hooks prevent accidental commits
- Documented in `README.md` Security & Configuration section

**Git Hooks:**
- Pre-commit hook checks for secrets in staged files
- Pre-push hook validates environment variables
- Implemented via Husky
- Scripts in `scripts/validate-env.js`

## Security Features

### Implemented Security Features

✅ **Content Security Policy (CSP)**
- Strict CSP with wildcard support for Supabase
- Configured in `src-tauri/tauri.conf.json`

✅ **Row Level Security (RLS) Policies**
- All tables have comprehensive RLS policies
- User isolation enforced at database level
- Documented in `supabase/README.md`

✅ **Deep Link URL Validation**
- Strict validation of scheme, host, path, parameters
- Length limits and duplicate parameter detection
- Implemented in `src/lib/security.ts`

✅ **Rate Limiting for Authentication**
- 5 attempts per 15 minutes per email
- Exponential backoff for repeated failures
- Client-side enforcement with UI feedback

✅ **CSRF State Token Validation**
- Cryptographically secure tokens
- 5-minute TTL with timestamp validation
- Used for email confirmation and password reset

✅ **Environment Variable Validation**
- Format checks for Supabase URL and anon key
- Git tracking checks to prevent commits
- Automated via npm scripts

✅ **Git Hooks to Prevent Secret Leaks**
- Pre-commit hook checks for secrets
- Pre-push hook validates environment
- Implemented via Husky

✅ **Database Constraints and Indexes**
- NOT NULL, CHECK, UNIQUE, FOREIGN KEY constraints
- Performance indexes for common queries
- Documented in migration files

✅ **IPC Event Allowlists (Rust and TypeScript)**
- All event IDs validated against allowlists
- Implemented in `src-tauri/src/main.rs` and `src/App.tsx`

✅ **Tauri Capabilities with Principle of Least Privilege**
- Only "main" window has capabilities
- No wildcard permissions
- Configured in `src-tauri/capabilities/default.json`

✅ **Window-Level Permission Restrictions**
- IPC events restricted to specific windows
- Prevents privilege escalation via new windows

✅ **Event Payload Validation**
- Type-safe event handlers
- Payload structure validation
- Implemented in `src/App.tsx`

✅ **IPC Rate Limiting**
- Maximum one event per second per event type
- Prevents DoS attacks via IPC spam
- Implemented in `src/App.tsx`

### Security Features in Development

🚧 **Two-Factor Authentication (2FA)**
- Waiting for Supabase to add 2FA support
- Will be implemented when available

🚧 **Server-Side Rate Limiting**
- Supabase has built-in rate limiting
- May add custom rate limiting for specific endpoints

🚧 **Automated Security Scanning**
- Plan to add GitHub Actions for dependency scanning
- Plan to add automated security audits

## Known Limitations

We believe in transparency about security limitations:

### 1. Client-Side Rate Limiting

**Limitation:** Rate limiting is enforced client-side and can be bypassed by modifying the client code.

**Mitigation:** 
- Supabase has server-side rate limiting that cannot be bypassed
- Client-side rate limiting provides defense-in-depth
- Monitoring can detect unusual patterns

**Risk Level:** Low (server-side rate limiting is primary defense)

### 2. RPC Functions Use SECURITY DEFINER

**Limitation:** RPC functions (`cleanup_tasks`, `mark_tasks_late`) use `SECURITY DEFINER` which runs with elevated privileges.

**Mitigation:**
- Functions explicitly filter by `auth.uid()` in WHERE clauses
- Cannot be exploited to access other users' data
- Thoroughly tested with multiple user accounts
- Documented in migration files

**Risk Level:** Low (proper filtering prevents exploitation)

### 3. Anon Key Exposed to Client

**Limitation:** The Supabase anon key is exposed to the client (in `.env` file).

**Mitigation:**
- This is by design and safe with RLS policies
- RLS policies restrict what the anon key can access
- Users can only access their own data
- Service role key is never exposed

**Risk Level:** None (this is the intended Supabase security model)

### 4. No Two-Factor Authentication (2FA)

**Limitation:** The app does not currently support 2FA.

**Mitigation:**
- Waiting for Supabase to add 2FA support
- Strong password requirements enforced
- Rate limiting prevents brute force attacks

**Risk Level:** Medium (will be addressed when Supabase adds 2FA)

### 5. Client-Side CSRF Token Storage

**Limitation:** CSRF tokens are stored in localStorage (accessible to JavaScript).

**Mitigation:**
- Tokens have short TTL (5 minutes)
- Tokens are single-use (cleared after validation)
- XSS protection via CSP

**Risk Level:** Low (short TTL and single-use limit exposure)

### 6. IPC Rate Limiting is Client-Side

**Limitation:** IPC rate limiting is enforced client-side and can be bypassed by modifying client code.

**Mitigation:**
- Event validation on both Rust and TypeScript sides
- Window restrictions prevent unauthorized windows
- Capabilities system provides framework-level protection
- Monitoring can detect unusual patterns

**Risk Level:** Low (multiple validation layers provide defense-in-depth)

### 7. Event-Based IPC Doesn't Provide Request/Response Pattern

**Limitation:** Event-based IPC is one-way (backend → frontend) and doesn't support request/response.

**Mitigation:**
- This is by design for current use cases (menu actions)
- Commands can be added if request/response is needed
- Current architecture is simpler and sufficient

**Risk Level:** None (this is an architectural choice, not a security limitation)

### 8. Window Restrictions Rely on Tauri's Security Model

**Limitation:** Window restrictions depend on Tauri framework's security implementation.

**Mitigation:**
- Tauri is a well-maintained, security-focused framework
- Multiple validation layers provide defense-in-depth
- Regular updates to latest Tauri version

**Risk Level:** Low (trust in framework is necessary for any framework-based app)

## Security Best Practices for Contributors

### For Code Contributors

**Always Follow These Practices:**

1. **Filter Database Queries by user_id**
   - All queries must filter by `user_id` for defense-in-depth
   - Even though RLS is primary security, client-side filtering is important
   - Example: `SELECT * FROM tasks WHERE user_id = $1`

2. **Never Commit Secrets or Credentials**
   - Use `.env` file for all secrets (gitignored)
   - Run `npm run check-secrets` before committing
   - If you accidentally commit a secret, rotate it immediately

3. **Use Security Utilities from `src/lib/security.ts`**
   - Don't reinvent security functions
   - Use existing `validateDeepLinkUrl`, `RateLimiter`, etc.
   - Add new utilities to this module if needed

4. **Test RLS Policies with Multiple User Accounts**
   - Create at least 2 test accounts
   - Verify User A cannot access User B's data
   - Test all CRUD operations

5. **Follow the Pull Request Template Security Checklist**
   - Complete all security checklist items
   - Document security implications
   - Request security review for sensitive changes

### For IPC Changes

**Always Follow These Practices:**

1. **Validate All IPC Event IDs Against Allowlists**
   - Add event IDs to allowlists in both Rust and TypeScript
   - Use allowlists (whitelists), not blocklists
   - Test that unauthorized events are rejected

2. **Validate Event Source (Window Label)**
   - Check that events come from expected windows
   - Reject events from unexpected sources
   - Log security violations for monitoring

3. **Implement Rate Limiting for New Events**
   - Add rate limiting to prevent abuse
   - Use appropriate time windows (e.g., 1 second)
   - Log rate limit violations

4. **Document IPC Security Implications in `default.md`**
   - Explain why the event/command is needed
   - Document security implications
   - Include mitigation strategies

5. **Test with Malicious Event Payloads**
   - Try to emit unauthorized events
   - Try to emit events with invalid payloads
   - Verify validation layers work correctly

6. **Review Capabilities Before Adding New Permissions**
   - Follow principle of least privilege
   - Only grant permissions actually needed
   - Document why each permission is required

### For Database Changes

**Always Follow These Practices:**

1. **Always Create RLS Policies for New Tables**
   - Every table must have SELECT, INSERT, UPDATE, DELETE policies
   - Policies must filter by `auth.uid() = user_id`
   - Test policies with multiple user accounts

2. **Add Appropriate Constraints and Indexes**
   - NOT NULL for required fields
   - CHECK constraints for data validation
   - UNIQUE constraints to prevent duplicates
   - Foreign keys for referential integrity
   - Indexes for query performance

3. **Document Security Implications in Migration Files**
   - Add SQL comments explaining security model
   - Reference application code that relies on constraints
   - Include test queries to verify policies

4. **Test with Multiple User Accounts**
   - Verify User A cannot access User B's data
   - Test INSERT, UPDATE, DELETE with wrong user_id
   - Verify constraints prevent invalid data

5. **Update `supabase/README.md`**
   - Document new tables and columns
   - Document RLS policies
   - Update migration history table

## Security Audit History

We maintain a log of security audits and findings:

| Date | Auditor | Type | Findings | Status |
|------|---------|------|----------|--------|
| 2025-01-01 | Internal | Initial Security Review | Documented security architecture | Completed |
| 2025-01-11 | Internal | IPC Security Audit | No input validation on menu events (FIXED), Overly permissive capabilities with wildcard windows (FIXED), No command allowlist defined (FIXED), No event payload validation (FIXED), Missing IPC security documentation (FIXED) | Completed |
| 2025-01-12 | Internal | Dependency Security Audit | No automated dependency scanning (FIXED), No formal update process (FIXED), Missing CI/CD workflows (FIXED), No SARIF reporting (FIXED) | Completed |
| 2025-01-12 | Internal | Tauri Framework Update | Updated Tauri from 2.8 to 2.9.2 for security patches and performance improvements, Updated plugins (fs 2.1.3, dialog 2.1.3, deep-link 2.0.1) | Completed |
| TBD | TBD | External Audit | TBD | Planned |

**Note:** This table will be updated as audits are performed.

## Dependency Security

### Dependency Management Philosophy

We follow a proactive approach to dependency security:
- **Regular Audits**: Weekly automated scans via GitHub Actions
- **Rapid Response**: Security updates applied within 48 hours of disclosure
- **Testing First**: All updates tested before merging
- **Transparency**: All dependency changes documented in pull requests
- **Version Pinning**: Lock files committed for reproducible builds

### Automated Dependency Scanning

**GitHub Actions Workflows:**

1. **Dependency Security Scanning** (`.github/workflows/dependency-scanning.yml`)
   - Runs on: Push to main, pull requests, weekly schedule (Mondays 06:00 UTC)
   - Jobs:
     - `npm-audit`: Scans npm dependencies with `npm audit --audit-level=high` 
     - `cargo-audit`: Scans Rust dependencies with `cargo audit` 
     - `trivy-scan`: Generates SARIF report for GitHub Code Scanning
     - `dependency-review`: Blocks PRs with vulnerable dependency changes
   - Results visible in: GitHub Security > Code scanning alerts

2. **Security Checks** (`.github/workflows/security-checks.yml`)
   - Runs on: Push to main, pull requests
   - Validates: Environment configuration, secret management, build security

**Local Development Tools:**

```bash
# Audit all dependencies (npm + cargo)
npm run audit:all

# Audit npm dependencies only
npm run audit:npm

# Audit Rust dependencies only
npm run audit:cargo

# Safely fix npm vulnerabilities (non-breaking updates)
npm run audit:fix

# Check for outdated dependencies
npm run deps:outdated

# Update dependencies within semver ranges
npm run deps:update

# Run all security checks (secrets, env, audits)
npm run security:check
```

### Dependency Update Process

**Weekly Routine (Automated):**
1. GitHub Actions runs dependency scans every Monday at 06:00 UTC
2. Vulnerabilities reported in GitHub Security > Code scanning alerts
3. Dependabot (if enabled) creates PRs for vulnerable dependencies
4. Team reviews and merges security updates within 48 hours

**Manual Update Process:**

**For npm Dependencies:**

1. **Check for Updates:**
   ```bash
   npm outdated
   ```

2. **Review Changelogs:**
   - Visit package repository (GitHub, npm)
   - Read CHANGELOG.md or release notes
   - Check for breaking changes

3. **Update Package:**
   ```bash
   # Update within semver range (safe)
   npm update package-name
   
   # Update to specific version
   npm install package-name@version
   
   # Update to latest (may include breaking changes)
   npm install package-name@latest
   ```

4. **Test Thoroughly:**
   ```bash
   npm run lint
   npm run build
   npm run tauri dev  # Manual testing
   ```

5. **Commit Lock File:**
   ```bash
   git add package.json package-lock.json
   git commit -m "chore(deps): update package-name to vX.Y.Z"
   ```

**For Rust Dependencies:**

1. **Check for Updates:**
   ```bash
   cd src-tauri
   cargo outdated  # Requires: cargo install cargo-outdated
   ```

2. **Update Cargo.toml:**
   - Manually edit version numbers in `Cargo.toml` 
   - Or use `cargo update` to update within semver ranges

3. **Update Lock File:**
   ```bash
   cargo update
   ```

4. **Test Build:**
   ```bash
   cargo build --release
   cargo test
   ```

5. **Commit Changes:**
   ```bash
   git add Cargo.toml Cargo.lock
   git commit -m "chore(deps): update rust-package to vX.Y.Z"
   ```

### Handling Security Advisories

**Detection:**
- GitHub Security Alerts (Dependabot)
- GitHub Actions workflow failures
- `npm audit` / `cargo audit` output
- Security mailing lists (npm, RustSec)

**Assessment:**
1. **Severity**: Critical, High, Moderate, Low
2. **Exploitability**: Is the vulnerability exploitable in our application?
3. **Impact**: What data or functionality is at risk?
4. **Patch Availability**: Is a patched version available?

**Response Timeline:**
- **Critical**: Patch within 24 hours
- **High**: Patch within 48 hours
- **Moderate**: Patch within 1 week
- **Low**: Patch in next regular update cycle

**Response Steps:**

1. **Immediate Action (Critical/High):**
   - Create hotfix branch: `git checkout -b hotfix/CVE-XXXX-YYYY` 
   - Update vulnerable dependency
   - Test thoroughly (even if urgent)
   - Create PR with "[SECURITY]" prefix
   - Fast-track review and merge
   - Deploy immediately

2. **Document the Fix:**
   - Update SECURITY.md with incident details
   - Add entry to Security Audit History table
   - Document in PR description:
     - CVE number (if applicable)
     - Vulnerability description
     - Affected versions
     - Fix applied
     - Testing performed

3. **Notify Users (if applicable):**
   - If user data was at risk, notify via GitHub Security Advisory
   - Provide guidance on what users should do (if anything)

### Dependency Overrides

**For Vulnerable Subdependencies:**

If a vulnerability exists in a transitive dependency (dependency of a dependency) and the parent package hasn't updated yet:

1. **Use npm overrides** (package.json):
   ```json
   {
     "overrides": {
       "vulnerable-package": "^patched-version"
     }
   }
   ```

2. **Verify the override:**
   ```bash
   npm install
   npm audit
   ```

3. **Document the override:**
   - Add comment in package.json explaining why
   - Create issue to track removal when parent updates
   - Reference CVE or advisory number

4. **Remove when possible:**
   - Monitor parent package for updates
   - Remove override once parent includes patched version

### Dependency Audit Thresholds

**CI/CD Failure Thresholds:**
- **npm audit**: Fails on `high` or `critical` severity
- **cargo audit**: Fails on any vulnerability (RustSec advisories)
- **Trivy**: Reports `high` and `critical` to Code Scanning
- **Dependency Review**: Blocks PRs with `high` or `critical` vulnerabilities

**Rationale:**
- `moderate` and `low` vulnerabilities are tracked but don't block CI
- Allows time for proper testing of updates
- Prevents false positives from blocking development
- Critical/high vulnerabilities require immediate action

### Lock File Management

**Best Practices:**

1. **Always Commit Lock Files:**
   - `package-lock.json` (npm)
   - `Cargo.lock` (Rust)
   - Ensures reproducible builds
   - Critical for security (prevents dependency confusion)

2. **Never Manually Edit Lock Files:**
   - Use `npm install` or `cargo update` to regenerate
   - Manual edits can cause inconsistencies

3. **Resolve Lock File Conflicts:**
   ```bash
   # For npm
   npm install  # Regenerates lock file
   
   # For Cargo
   cargo update  # Regenerates lock file
   ```

4. **Verify Lock File Integrity:**
   ```bash
   # npm
   npm ci  # Fails if lock file is out of sync
   
   # Cargo
   cargo build  # Uses lock file for reproducible builds
   ```

### Supply Chain Security

**Preventive Measures:**

1. **Vet New Dependencies:**
   - Check package popularity (npm downloads, GitHub stars)
   - Review maintainer reputation
   - Check for recent activity (not abandoned)
   - Review open issues and security history
   - Prefer packages with security policies

2. **Minimize Dependencies:**
   - Only add dependencies when necessary
   - Prefer standard library solutions when possible
   - Regularly audit and remove unused dependencies

3. **Pin Versions:**
   - Use exact versions for critical dependencies
   - Use semver ranges for non-critical dependencies
   - Lock files provide additional pinning

4. **Monitor for Hijacks:**
   - GitHub Actions scans detect compromised packages
   - Review dependency changes in PRs carefully
   - Watch for unexpected version bumps

### Tools and Resources

**Installed Tools:**
- `npm audit` (built-in with npm)
- `cargo-audit` (install: `cargo install cargo-audit --locked`)
- `cargo-outdated` (optional: `cargo install cargo-outdated`)

**GitHub Actions:**
- `actions/dependency-review-action` - PR-time dependency checks
- `aquasecurity/trivy-action` - SARIF vulnerability scanning
- `actions-rs/audit-check` - Rust dependency auditing (alternative)

**External Resources:**
- [npm Security Best Practices](https://docs.npmjs.com/auditing-package-dependencies-for-security-vulnerabilities)
- [RustSec Advisory Database](https://rustsec.org/)
- [GitHub Dependency Review](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/about-dependency-review)
- [Snyk Vulnerability Database](https://snyk.io/vuln/)

### Dependency Security Checklist

Before every release:

- [ ] Run `npm run audit:all` locally
- [ ] Review GitHub Security > Code scanning alerts
- [ ] Check for outdated dependencies (`npm run deps:outdated`)
- [ ] Review and merge any pending Dependabot PRs
- [ ] Verify lock files are committed and up-to-date
- [ ] Test application thoroughly after dependency updates
- [ ] Document any dependency overrides or workarounds
- [ ] Update SECURITY.md if dependency policies change

## Incident Response

If a security incident occurs, follow these steps:

### 1. Immediate Response

**If credentials are compromised:**
1. Immediately rotate the compromised credentials
2. Revoke the old credentials in Supabase Dashboard
3. Update `.env` file with new credentials
4. Redeploy the application

**If a vulnerability is being actively exploited:**
1. Assess the scope of the breach
2. Contain the vulnerability (disable affected feature if necessary)
3. Notify affected users (if applicable)
4. Document the incident

### 2. Assessment

- **Scope:** Determine what data or systems were affected
- **Impact:** Assess the impact on users and the application
- **Root Cause:** Identify how the incident occurred
- **Timeline:** Document when the incident started and was discovered

### 3. Notification

**If user data was accessed or compromised:**
- Notify affected users via email within 72 hours
- Provide details about what data was affected
- Explain what steps we are taking
- Provide guidance for users (e.g., change password)

**If no user data was compromised:**
- Internal documentation only
- Public disclosure in security advisory (after fix)

### 4. Remediation

- **Fix the Vulnerability:** Implement a fix and test thoroughly
- **Deploy the Fix:** Deploy to production as soon as possible
- **Verify the Fix:** Confirm the vulnerability is resolved
- **Document the Fix:** Update security documentation

### 5. Post-Incident Review

- **Lessons Learned:** What went wrong and how can we prevent it?
- **Process Improvements:** Update security processes and documentation
- **Preventive Measures:** Implement additional security controls
- **Communication:** Share learnings with the team

### 6. Documentation

Document the incident in this file:

| Date | Incident | Severity | Impact | Resolution | Status |
|------|----------|----------|--------|------------|--------|
| TBD | TBD | TBD | TBD | TBD | TBD |

## Security Resources

### Project-Specific Documentation

- [README.md - Security & Configuration](README.md#security--configuration)
- [README.md - Authentication Security](README.md#authentication-security)
- [README.md - Database Security](README.md#database-security)
- [README.md - IPC & Tauri Security](README.md#ipc--tauri-security)
- [src-tauri/capabilities/default.md - Capabilities Documentation](src-tauri/capabilities/default.md)
- [supabase/README.md - Database Documentation](supabase/README.md)
- [.github/PULL_REQUEST_TEMPLATE.md - Security Checklist](.github/PULL_REQUEST_TEMPLATE.md)

### External Resources

**Supabase Security:**
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)

**Tauri Security:**
- [Tauri Security Documentation](https://tauri.app/v1/guides/security/)
- [Tauri Content Security Policy](https://tauri.app/v1/api/config/#securityconfig)

**General Security:**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [CWE Top 25 Most Dangerous Software Weaknesses](https://cwe.mitre.org/top25/)

## Contact Information

### Security Contact

**Primary Contact:** [security@your-domain.com] <!-- Update with actual security contact -->

**GitHub Security Advisories:** [Repository Security Tab](https://github.com/your-org/todo-app/security) <!-- Update with actual repository URL -->

**Response Time:** We aim to respond to security reports within 48 hours.

### Maintainers

For non-security issues, please use the standard GitHub issue tracker.

---

**Thank you for helping keep the Todo App secure!**

If you have any questions about this security policy, please contact us at the email address above.
