# Deep Link Security Testing

## 1. Overview
- **Scheme:** `todoapp://`
- **Host allowlist:** `auth`
- **Paths:** `/callback`, `/password-reset`
- **Params allowlist:** `access_token`, `refresh_token`, `type`, `token_hash`, `state`
- **Validator:** `validateDeepLinkUrl`

## 2. Environment Setup
- macOS: trigger with `open "todoapp://..."`
- Monitor logs via Console.app and in-app logger; use DevTools for behavior.
- Prepare valid tokens and state tokens from auth flows.

## 3. Validation Test Cases

### DL-001: Valid Deep Links
- Expect `isValid: true` and session handling when tokens valid.

### DL-002: Invalid Scheme
- Examples: `http://...`, `https://...`, `javascript://...`, `file://...`, `todoapp2://...`
- Expect reason: Invalid scheme.

### DL-003: Invalid Host
- Examples: `todoapp://evil.com/...`, `todoapp://localhost/...`, `todoapp://auth.evil.com/...`, `todoapp://attacker/...`, case tests.
- Expect reason: Invalid host.

### DL-004: Invalid Path
- Examples: `/admin`, `/users`, `/callback/../admin`, `/`, `/callback/extra`.
- Expect reason: Path not allowed.

### DL-005: Invalid Query Parameters
- Examples: `malicious=payload`, `admin=true`, `user_id=...`, `redirect=https://evil.com`.
- Expect reason: Query parameter not allowed.

### DL-006: Duplicate Parameters
- Examples: `access_token` duplicated, `state` duplicated.
- Expect reason: Duplicate parameter.

### DL-007: URL Fragments
- Examples with `#fragment`.
- Expect reason: Fragments not allowed.

### DL-008: URL Length Limit
- Exceed 2048 chars → Expect length error.

## 4. Injection Attack Test Cases

### DL-INJ-001: XSS in Parameters
- Expect no JS execution; sanitized error messages; CSP violations only.

### DL-INJ-002: SQL Injection in Parameters
- Expect treated as strings; no DB impact.

### DL-INJ-003: Path Traversal
- Expect rejection; no FS access.

## 5. State Token Security Test Cases

### DL-STATE-001: Missing State Token (MANDATORY)
- **Objective:** Verify state token is required for all auth callbacks
- **Examples:** 
  - `todoapp://auth/callback?access_token=xxx&refresh_token=yyy` (no state)
  - `todoapp://auth/password-reset?access_token=xxx&refresh_token=yyy&type=recovery` (no state)
- **Expected:** Rejected with code `MISSING_STATE_TOKEN`; generic error message shown.

### DL-STATE-002: Invalid State Token
- **Objective:** Verify state token must match stored value
- **Examples:**
  - `todoapp://auth/callback?access_token=xxx&refresh_token=yyy&state=invalid`
  - `todoapp://auth/callback?access_token=xxx&refresh_token=yyy&state=wrong_token`
- **Expected:** Rejected with code `INVALID_STATE_TOKEN`; generic error message shown.

### DL-STATE-003: Expired State Token
- **Objective:** Verify state token expires after 5 minutes
- **Procedure:**
  1. Generate state token
  2. Store in localStorage
  3. Wait 6 minutes
  4. Attempt to use token in deep link
- **Expected:** Rejected with code `INVALID_STATE_TOKEN`; generic error message shown.

## 6. Type Parameter Validation Test Cases

### DL-TYPE-001: Invalid Type for Password Reset
- **Objective:** Verify password-reset path requires type=recovery
- **Examples:**
  - `todoapp://auth/password-reset?type=invalid&access_token=xxx&refresh_token=yyy&state=zzz`
  - `todoapp://auth/password-reset?type=malicious&access_token=xxx&refresh_token=yyy&state=zzz`
  - `todoapp://auth/password-reset?access_token=xxx&refresh_token=yyy&state=zzz` (missing type)
- **Expected:** Rejected with code `INVALID_TYPE_PARAM`; generic error message shown.

### DL-TYPE-002: Valid Type for Password Reset
- **Objective:** Verify type=recovery is accepted
- **Example:** `todoapp://auth/password-reset?type=recovery&access_token=xxx&refresh_token=yyy&state=zzz`
- **Expected:** Accepted; password reset flow initiated.

## 7. Integration Tests
- Full email confirmation and password reset flows via deep links; expect successful auth and flows.
- All flows must include valid state tokens.

## 8. Reason Code Verification

**Objective:** Verify that validation failures return structured reason codes instead of free-form strings.

**Test Cases:**
- Invalid scheme → code: `INVALID_SCHEME`
- Invalid host → code: `INVALID_HOST`
- Invalid path → code: `INVALID_PATH`
- Invalid query param → code: `INVALID_QUERY_PARAM`
- Duplicate param → code: `DUPLICATE_PARAM`
- Fragment present → code: `FRAGMENT_NOT_ALLOWED`
- URL too long → code: `URL_TOO_LONG`
- Invalid URL format → code: `INVALID_URL_FORMAT`
- Invalid type param → code: `INVALID_TYPE_PARAM`
- Missing state token → code: `MISSING_STATE_TOKEN`
- Invalid state token → code: `INVALID_STATE_TOKEN`

**Logging Verification:**
- In production: Only reason code logged (no sensitive details)
- In development: Reason code + details logged
- User-facing errors: Generic security messages (no specific details)

## 9. Automated Test Script

```bash
#!/bin/bash
# deep-link-test.sh - Automated deep link security testing

set -euo pipefail

echo "Deep Link Security Test Suite"
echo "=============================="

# Invalid schemes
printf "\nTest: Invalid Schemes\n"
open "http://auth/callback?access_token=test" 2>&1 | grep -q "Invalid scheme" && echo "✓ PASS" || echo "✗ FAIL"
open "https://auth/callback?access_token=test" 2>&1 | grep -q "Invalid scheme" && echo "✓ PASS" || echo "✗ FAIL"

# Invalid hosts
printf "\nTest: Invalid Hosts\n"
open "todoapp://evil.com/callback?access_token=test" 2>&1 | grep -q "Invalid host" && echo "✓ PASS" || echo "✗ FAIL"

# Invalid paths
printf "\nTest: Invalid Paths\n"
open "todoapp://auth/admin?access_token=test" 2>&1 | grep -q "Path not allowed" && echo "✓ PASS" || echo "✗ FAIL"

printf "\nTest suite complete\n"
```

## 10. Test Execution Log Template

```markdown
## Deep Link Security Test Log

**Test Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** [Development/Staging/Production]

| Test Case | URL | Expected | Actual | Status |
|-----------|-----|----------|--------|--------|
| DL-002 | http://auth/callback | Rejected | Rejected | PASS |
| DL-003 | todoapp://evil.com/callback | Rejected | Rejected | PASS |
| ... | ... | ... | ... | ... |

**Findings:** [Issues]
**Recommendations:** [Improvements]
```
