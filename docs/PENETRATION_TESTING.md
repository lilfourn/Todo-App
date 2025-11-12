# Penetration Testing Procedures

## 1. XSS (Cross-Site Scripting) Testing

### Test Case PT-XSS-001: Stored XSS in Task Names
- **Objective:** Verify sanitization; no JS execution.
- **Payloads:** `<script>alert('XSS')</script>`, `<img src=x onerror=alert('XSS')>`, `<svg onload=alert('XSS')>`, `javascript:alert('XSS')`, `<iframe src="javascript:alert('XSS')">`
- **Procedure:** Sign in → create tasks with payloads → refresh → observe.
- **Expected:** Rendered as text; only CSP violations in console.

### Test Case PT-XSS-002: Reflected XSS in Deep Links
- **Objective:** Deep link parameters cannot inject JS.
- **Payloads:** `todoapp://auth/callback?access_token=<script>alert('XSS')</script>`, `...&state=javascript:alert('XSS')`, `todoapp://auth/password-reset?token=<img src=x onerror=alert('XSS')>`
- **Expected:** Validation rejects; no JS runs.

### Test Case PT-XSS-003: DOM-Based XSS
- **Procedure:** In console: `document.querySelector('.task-name').innerHTML = '<img src=x onerror=alert("XSS")>'`.
- **Expected:** No execution due to CSP; violation logged.

## 2. CSRF (Cross-Site Request Forgery) Testing

### PT-CSRF-001: State Token Validation
- **Procedure:** Modify `state` to invalid in callback link; open.
- **Expected:** Validation fails; no session.

### PT-CSRF-002: State Token Expiry
- **Procedure:** Use token after 6 minutes.
- **Expected:** Expired; rejected.

### PT-CSRF-003: State Token Reuse
- **Procedure:** Reuse same confirmation link.
- **Expected:** Second attempt rejected.

### PT-CSRF-004: Bearer Token Protection
- **Procedure:** Inspect network; Authorization header present; no cookies; attempt without header fails.

## 3. SQL Injection Testing

### PT-SQL-001: Task Name Injection
- **Payloads:** `'; DROP TABLE tasks; --`, `' OR '1'='1`, `'; UPDATE tasks SET user_id='attacker' WHERE '1'='1`, `' UNION SELECT * FROM auth.users --`
- **Expected:** Stored as text; no SQL errors; DB intact.

### PT-SQL-002: RLS Policy Bypass Attempts
- **Procedure:** As User A, try inserting with User B ID via console/SQL.
- **Expected:** RLS rejects.

### PT-SQL-003: RPC Function Injection
- **Procedure:** Review RPC definitions; test with malicious params.
- **Expected:** Safe; filtered by `auth.uid()`.

## 4. Authentication Bypass Testing

### PT-AUTH-001: Unauthenticated API Access
- **Procedure:** Signed out, query/insert tasks via client.
- **Expected:** Blocked by RLS.

### PT-AUTH-002: Rate Limit Bypass
- **Procedure:** 5 bad logins; clear storage/incognito; retry.
- **Expected:** Limits enforced (Supabase server-side); client limiter adds defense.

### PT-AUTH-003: Session Hijacking
- **Procedure:** Copy tokens to incognito; confirm access; wait expiry.
- **Expected:** Works until expiry; no leaks in logs/URLs.

### PT-AUTH-004: Password Reset Token Reuse
- **Expected:** Second use fails.

## 5. Authorization Testing

### PT-AUTHZ-001: Horizontal Escalation
- **Procedure:** User B tries to read/update User A’s tasks by ID.
- **Expected:** 0 rows or error.

### PT-AUTHZ-002: Vertical Escalation
- **Procedure:** Attempt to read `auth.users`.
- **Expected:** Permission denied.

## 6. Test Execution Log Template

```markdown
## Penetration Test Execution Log

**Test Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** [Development/Staging/Production]
**Application Version:** [Git commit hash]

### Test Results Summary

| Test Case | Status | Severity | Notes |
|-----------|--------|----------|-------|
| PT-XSS-001 | PASS | Critical | All payloads sanitized |
| PT-XSS-002 | PASS | Critical | Deep link validation working |
| PT-XSS-003 | PASS | High | CSP blocks DOM XSS |
| PT-CSRF-001 | PASS | Critical | State tokens validated |
| ... | ... | ... | ... |

### Findings

**Finding 1: [Title]**
- **Severity:** Critical/High/Medium/Low
- **Test Case:** PT-XXX-NNN
- **Description:** [Detailed description]
- **Impact:** [What an attacker could achieve]
- **Reproduction Steps:** [Step-by-step]
- **Recommendation:** [How to fix]
- **Status:** Open/Fixed/Accepted Risk

### Conclusion

[Overall assessment of security posture]
```

## 7. Remediation Guidance
- For each failure: document root cause, code reference, fix steps, verification, and add regression tests.
