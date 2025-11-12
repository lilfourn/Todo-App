# Pre-Release Security Checklist

## 1. Introduction
- Use before every production release. Covers SECURITY-001 → SECURITY-006. Requires security lead sign-off.

## 2. Checklist

### Phase 1: CSP & Secrets (SECURITY-001)
- [ ] CSP configured in Tauri config for prod/dev
- [ ] Supabase domains whitelisted (https/wss)
- [ ] No `unsafe-inline`/`unsafe-eval` in prod
- [ ] COOP/COEP/CORP/X-Content-Type-Options/Permissions-Policy set
- [ ] `.env` present and ignored; `.env.example` present
- [ ] `npm run validate-env` passes; secret checks pass
- [ ] No secrets in history; service role key not present
- [ ] HTTPS enforced; no mixed content

### Phase 2: Auth & Session (SECURITY-002)
- [ ] Deep link scheme/host/path/param allowlists enforced
- [ ] URL length, dup params, fragments rejected
- [ ] CSRF state tokens: strong, TTL 5m, single-use
- [ ] Sign-up/reset flows include state
- [ ] Rate limiting: attempts and backoff enforced
- [ ] Sessions: localStorage only, no cookies; auto-refresh; sign-out clears

### Phase 3: DB & RLS (SECURITY-003)
- [ ] RLS enabled on all tables; policies for SELECT/INSERT/UPDATE/DELETE
- [ ] Constraints and indexes present; FKs enforced
- [ ] RPC functions filter by `auth.uid()`; EXECUTE granted to authenticated
- [ ] App queries filter by `user_id`

### Phase 4: Logging & Prod (SECURITY-004)
- [ ] Logger replaces console; sanitizes sensitive data
- [ ] ErrorBoundary wraps app; fallback UI + logging
- [ ] Prod build strips console; source maps handled; size optimized
- [ ] Rust: no debug logs in release

### Phase 5: IPC & Tauri (SECURITY-005)
- [ ] Event/menu ID allowlists; payload/type checks; window label validated
- [ ] IPC rate limiting
- [ ] Capabilities least-privilege; no wildcards; documented

### Phase 6: Dependencies (SECURITY-006)
- [ ] npm and cargo audits pass
- [ ] GitHub Actions security workflows green; SARIF uploaded
- [ ] Dependabot enabled; PRs reviewed
- [ ] Supply chain vetted; no typosquatting

## Penetration Testing
- [ ] XSS tests pass
- [ ] CSRF tests pass
- [ ] SQLi tests pass
- [ ] Auth bypass tests pass
- [ ] Authorization tests pass

## Documentation
- [ ] SECURITY.md up to date
- [ ] README.md security sections updated
- [ ] All testing docs present

## Final Verification
- [ ] All CI pipelines green
- [ ] Manual tests completed; logs archived
- [ ] Security code review complete
- [ ] Deployment readiness verified

## Sign-Off
- Release: ________  Date: ________  Commit: ________
- Security Lead: __________________  Signature: __________________

## Post-Release Monitoring
- 24h/Week/Ongoing checks for errors, logs, alerts, dependencies
