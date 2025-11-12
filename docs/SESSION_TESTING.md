# Session Management Testing

## 1. Overview
- Supabase Auth; JWT tokens in localStorage; auto-refresh; no cookies.

## 2. Setup
- Use DevTools (Application, Network), multiple browsers/incognito, test users.

## 3. Token Storage & Handling
- SESSION-001: Tokens only in localStorage; not in cookies/URL.
- SESSION-002: JWT structure and claims valid; `sub`, `email`, `exp`.
- SESSION-003: Expiry/auto-refresh verified via Network.
- SESSION-004: No tokens logged (logger sanitizes).

## 4. Session Lifecycle
- SESSION-005: Sign in creates session and tokens.
- SESSION-006: Sign out clears state and tokens; redirects to auth.
- SESSION-007: App restart persists session from storage.
- SESSION-008: Password change invalidates other sessions (Supabase behavior).

## 5. Multi-Session
- SESSION-009: Multiple sessions work concurrently.
- SESSION-010: Session isolation by tokens; swapping tokens swaps identity.

## 6. Token Refresh
- SESSION-011: Auto refresh before expiry extends `exp`.
- SESSION-012: Expired refresh token forces re-auth.
- SESSION-013: Invalid refresh token rejected; sign-out.

## 7. Session Security
- SESSION-014: Token theft simulation demonstrates bearer-token nature; rely on HTTPS and expiry.
- SESSION-015: Session fixation not applicable to JWT; each auth yields new tokens.
- SESSION-016: No default concurrent session limit (Supabase default).

## 8. Rate Limiting
- SESSION-017: 5 failed sign-ins → blocked; error indicates rate limit.
- SESSION-018: Clearing storage doesn’t bypass server-side limits.

## 9. Deep Link Session
- SESSION-019: Email confirmation creates session via deep link.
- SESSION-020: Password reset creates temporary then permanent session.

## 10. Test Execution Log Template

```markdown
## Session Management Test Execution Log

**Test Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** [Development/Staging/Production]
**Supabase Project:** [Project URL]

| Test Case | Category | Status | Notes |
|-----------|----------|--------|-------|
| SESSION-001 | Token Storage | PASS | Tokens in localStorage only |
| SESSION-002 | Token Format | PASS | Valid JWT structure |
| SESSION-003 | Token Expiry | PASS | Auto-refresh working |
| SESSION-004 | Token Logging | PASS | No tokens in console |
| SESSION-005 | Sign In | PASS | Session created |
| SESSION-006 | Sign Out | PASS | Session cleared |
| SESSION-007 | Persistence | PASS | Session survives restart |
| ... | ... | ... | ... |

### Security Findings

[Any session security issues discovered]

### Recommendations

[Suggested improvements]
```
