# Security Testing Master Guide

## 1. Introduction (Overview)
- **Purpose:** Provide a practical, executable guide to validate the app’s security posture.
- **Scope:** SECURITY-001 through SECURITY-006 covering CSP/Secrets, Auth/Session, RLS/DB, Error Logging, IPC/Tauri, Dependencies.
- **Philosophy:** Validate defense-in-depth; assume attacker creativity; prefer explicit pass/fail criteria.
- **Prerequisites:**
  - Access to Supabase project (anon key) and test accounts
  - Node/npm, cargo (for Tauri), curl, jq, a modern browser with DevTools
  - macOS for deep-link tests (uses `open`), or adapt for OS
- **Environment:** Use a dedicated Supabase test project and test `.env`.

## 2. Test Environment Setup
- **Test users:** Create User A, User B, User C with strong passwords; record UUIDs.
- **Supabase project:** Apply all migrations in `supabase/migrations/`.
- **Environment variables:** Configure `.env` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- **Tools:**
  - curl, jq
  - Browser DevTools
  - Optional: Postgres SQL Editor in Supabase
- **Test data:** Seed a few tasks per user via UI or SQL.

## 3. Security Testing Phases Overview
- **SECURITY-001:** CSP & secret management
- **SECURITY-002:** Deep links, CSRF state tokens, rate limiting, sessions
- **SECURITY-003:** RLS policies, constraints, RPC security
- **SECURITY-004:** Logger, ErrorBoundary, prod build hardening
- **SECURITY-005:** IPC allowlists, payload validation, capabilities
- **SECURITY-006:** Dependency audits, CI workflows, Dependabot
- **Order:** 1 → 6. Estimated 2–4 hours total. Skill: intermediate.

## 4. Quick Reference
- **Common commands:**
  - `npm run security:check`
  - `npm run audit:all`
  - `npm run build:check`
- **Supabase:** Project URL from `.env`, anon key in local config only.
- **Expected security responses:** RLS denials, CSP violations (no script execution), 401/403 for unauth.
- **Common failures:** Missing state tokens, unfiltered queries, too-permissive capabilities.

## 5. Test Execution Tracking
- **Template:** Use the Execution Log templates in this guide’s linked docs to record date, tester, env, version, case status, severity, notes, remediation.
- **Criteria:** Every case has explicit pass/fail; severity: Critical, High, Medium, Low.
- **Remediation:** Track issues to closure; re-test before release.

## 6. References to Detailed Test Procedures
- See detailed procedures:
  - `docs/PENETRATION_TESTING.md`
  - `docs/DEEP_LINK_TESTING.md`
  - `docs/RLS_TESTING.md`
  - `docs/SESSION_TESTING.md`
  - `docs/SECURITY_CHECKLIST.md`

## 7. Continuous Security Testing
- **CI/CD:** Run dependency scans and build checks on push/PR/schedule.
- **Automation vs manual:** Automate audits/build; keep penetration tests manual with scripts where safe.
- **Regression:** Re-run failed cases after fixes; keep scripts under version control.
- **Schedule:**
  - Pre-release: full checklist
  - Weekly: CI security checks
  - Monthly: spot-check pen tests

## 8. Reporting Security Issues
- **Process:** Log issue with severity, reproduction, and recommendation.
- **Escalation:** Critical/High block release; notify security lead.
- **Reference:** See `SECURITY.md` for disclosure/reporting.

---

# Execution Index
- Penetration Tests: `docs/PENETRATION_TESTING.md`
- Deep Link Tests: `docs/DEEP_LINK_TESTING.md`
- RLS Tests: `docs/RLS_TESTING.md`
- Session Tests: `docs/SESSION_TESTING.md`
- Release Checklist: `docs/SECURITY_CHECKLIST.md`
