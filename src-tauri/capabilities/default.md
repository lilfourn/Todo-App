# Tauri Capabilities Documentation

## Overview

This document explains the security model for Tauri IPC (Inter-Process Communication) in the Todo App. Tauri capabilities define what permissions each window has, following the **principle of least privilege** to minimize the attack surface.

### What are Tauri Capabilities?

Capabilities are Tauri's security mechanism that:
- Define which windows can access which system resources
- Restrict IPC communication between Rust backend and TypeScript frontend
- Prevent unauthorized access to sensitive operations
- Follow an explicit allowlist approach (deny by default)

### Why This Matters

Without proper capabilities configuration:
- Malicious windows could access sensitive operations
- IPC-based exploits could escalate privileges
- Unauthorized code could emit/listen to events
- System resources could be accessed without permission

## Window Restrictions

### Current Configuration

```json
"windows": ["main"]
```

**Why Only "main" Window?**
- The application has a single window architecture
- Restricting to "main" prevents wildcard permissions (`["*"]`)
- Any additional windows would need explicit capability grants
- Prevents malicious windows from inheriting permissions

**Security Implications:**
- ✅ Only the main application window can use these capabilities
- ✅ Prevents privilege escalation via new windows
- ✅ Limits attack surface to a single, trusted window
- ❌ Wildcard `["*"]` would allow ANY window to access capabilities (insecure)

**Adding New Windows:**
If you need to add a new window in the future:
1. Create the window with a unique label (e.g., "settings")
2. Add the label to the `windows` array: `["main", "settings"]`
3. Document why the new window needs these capabilities
4. Test that the window can't access capabilities it shouldn't have

## Permission Breakdown

Each permission in `default.json` is documented below with its purpose, usage, and security implications.

### core:window:allow-start-dragging

**Purpose:** Allows the window to be dragged by custom title bar regions

**Used by:** Custom title bar in `App.tsx` (line 301) with `data-tauri-drag-region` attribute

**Why Needed:** The application uses a custom title bar with macOS vibrancy effects. Without this permission, users couldn't move the window by dragging the title bar area.

**Security Implications:**
- **Risk Level:** Low
- **What could go wrong:** Malicious code could only affect window positioning, not access sensitive data
- **Mitigation:** Permission is scoped to window dragging only, no other operations

**Alternatives Considered:**
- Using native title bar: Rejected because custom title bar provides better UX with vibrancy
- Removing drag functionality: Rejected because users need to move the window

---

### core:event:allow-listen

**Purpose:** Allows the frontend to listen to events emitted from the Rust backend

**Used by:** Event listeners in `App.tsx` (lines 151, 187) for menu events

**Why Needed:** Critical for menu functionality. The Rust backend emits events when users click menu items (Sign Out, Preferences), and the frontend must listen to these events to respond.

**Security Implications:**
- **Risk Level:** Medium
- **What could go wrong:** Without validation, malicious code could listen to unauthorized events
- **Mitigation:** 
  - Events validated against allowlist in TypeScript (`ALLOWED_EVENTS`)
  - Event source validated (must come from "main" window)
  - Rate limiting prevents event spam
  - Payload validation ensures type safety

**Events Listened To:**
- `sign-out-user` - Triggers user sign out
- `navigate-to-preferences` - Opens preferences modal

**Alternatives Considered:**
- Command-based IPC: Rejected because events are simpler for one-way communication (backend → frontend)
- No IPC: Rejected because menu functionality requires backend-to-frontend communication

---

### core:event:allow-emit

**Purpose:** Allows the Rust backend to emit events to the frontend

**Used by:** Menu event handler in `main.rs` (lines 155, 172)

**Why Needed:** Required for Rust backend to send menu events to the TypeScript frontend. When users click menu items, Rust emits events that the frontend listens to.

**Security Implications:**
- **Risk Level:** Medium
- **What could go wrong:** Malicious code could emit unauthorized events to trigger unintended actions
- **Mitigation:**
  - Event IDs validated against allowlist in Rust (`ALLOWED_MENU_IDS`)
  - Only "main" window can receive events
  - Window label validated before emitting
  - Graceful error handling prevents information leakage

**Events Emitted:**
- `navigate-to-preferences` - Emitted when "Preferences" menu item clicked
- `sign-out-user` - Emitted when "Sign Out" menu item clicked

**Alternatives Considered:**
- Frontend polling: Rejected because event-driven architecture is more efficient
- No backend menu: Rejected because native macOS menu provides better UX

---

### core:window:allow-show

**Purpose:** Allows programmatic showing of the window

**Used by:** Window management operations (implicit usage)

**Why Needed:** Part of standard window lifecycle management. Required for showing the window after it's been hidden.

**Security Implications:**
- **Risk Level:** Low
- **What could go wrong:** Malicious code could show the window unexpectedly
- **Mitigation:** Limited to window visibility control, no data access

---

### core:window:allow-hide

**Purpose:** Allows programmatic hiding of the window

**Used by:** Window management operations (implicit usage)

**Why Needed:** Part of standard window lifecycle management. Required for hiding the window when needed.

**Security Implications:**
- **Risk Level:** Low
- **What could go wrong:** Malicious code could hide the window, causing UX issues
- **Mitigation:** Limited to window visibility control, no data access

---

### core:window:allow-close

**Purpose:** Allows programmatic closing of the window

**Used by:** Window management operations (implicit usage)

**Why Needed:** Required for proper window lifecycle management and application shutdown.

**Security Implications:**
- **Risk Level:** Low
- **What could go wrong:** Malicious code could close the window unexpectedly
- **Mitigation:** Limited to window lifecycle, no data loss (data is in Supabase)

---

### core:window:allow-minimize

**Purpose:** Allows programmatic minimizing of the window

**Used by:** Window menu "Minimize" option in `main.rs` (line 107)

**Why Needed:** Users need to minimize the window via the Window menu or keyboard shortcut.

**Security Implications:**
- **Risk Level:** Low
- **What could go wrong:** Malicious code could minimize the window, causing UX issues
- **Mitigation:** Limited to window state control, no data access

---

### core:window:allow-maximize

**Purpose:** Allows programmatic maximizing of the window

**Used by:** Window menu "Maximize" option in `main.rs` (line 108)

**Why Needed:** Users need to maximize the window via the Window menu or keyboard shortcut.

**Security Implications:**
- **Risk Level:** Low
- **What could go wrong:** Malicious code could maximize the window unexpectedly
- **Mitigation:** Limited to window state control, no data access

---

### core:app:default

**Purpose:** Provides access to default app metadata and lifecycle operations

**Used by:** Application lifecycle management (implicit usage)

**Why Needed:** Required for basic app operations like getting app version, name, and handling lifecycle events.

**Security Implications:**
- **Risk Level:** Low
- **What could go wrong:** Exposes app metadata (version, name) but no sensitive data
- **Mitigation:** Default permission set is minimal and well-scoped

**Included Permissions:**
- App metadata access (name, version)
- App lifecycle events
- Basic app information

**Alternatives Considered:**
- Specific app permissions: Could be more granular, but `default` is minimal enough
- No app permissions: Rejected because basic app operations are needed

---

### dialog:default

**Purpose:** Provides access to native dialog functionality

**Used by:** Preferences component for password reset and account deletion confirmations

**Why Needed:** Required for showing native dialogs (alerts, confirmations) for user interactions like password reset and account deletion.

**Security Implications:**
- **Risk Level:** Low
- **What could go wrong:** Malicious code could show unwanted dialogs
- **Mitigation:** Dialogs are user-initiated and don't expose sensitive data

**Included Permissions:**
- Show message dialogs
- Show confirmation dialogs
- Show file picker dialogs (not currently used)

**Alternatives Considered:**
- Custom HTML dialogs: Rejected because native dialogs provide better UX and OS integration
- No dialogs: Rejected because confirmations are needed for destructive actions

## Event Allowlist

### Allowed Events

The application uses a strict allowlist of IPC events. Only these events can be emitted and listened to:

#### 1. sign-out-user

**Purpose:** Triggered when user clicks "Sign Out" in the macOS menu

**Emitted by:** Rust menu handler (`main.rs` line 172)

**Listened by:** Main app component (`App.tsx` line 151)

**Payload:** Empty (no data transmitted)

**Action:** Calls `signOut()` from AuthContext to clear session and user data

**Validation:**
- ✅ Event ID validated in Rust against `ALLOWED_MENU_IDS`
- ✅ Window label validated (must be "main")
- ✅ Event source validated in TypeScript
- ✅ Event name validated against `ALLOWED_EVENTS`
- ✅ Rate limited (max once per second)

**Security Considerations:**
- No sensitive data in payload (empty)
- User must be authenticated for sign out to have effect
- Logged for audit trail

---

#### 2. navigate-to-preferences

**Purpose:** Triggered when user clicks "Preferences" in the macOS menu

**Emitted by:** Rust menu handler (`main.rs` line 155)

**Listened by:** Main app component (`App.tsx` line 187)

**Payload:** Empty (no data transmitted)

**Action:** Shows preferences modal via `setShowPreferences(true)`

**Validation:**
- ✅ Event ID validated in Rust against `ALLOWED_MENU_IDS`
- ✅ Window label validated (must be "main")
- ✅ Event source validated in TypeScript
- ✅ Event name validated against `ALLOWED_EVENTS`
- ✅ Rate limited (max once per second)
- ✅ Checks if preferences already shown (prevents duplicates)

**Security Considerations:**
- No sensitive data in payload (empty)
- Idempotent operation (safe to call multiple times)
- Logged for audit trail

## Command Allowlist

### Current Status

**No Tauri commands are currently used in the application.**

The unused `sign_out` command was removed from `main.rs` in favor of the event-based IPC pattern.

### Why Events Instead of Commands?

**Events are used because:**
- Simpler for one-way communication (backend → frontend)
- Menu actions don't require responses
- Events provide sufficient security with proper validation
- Less boilerplate code

**Commands would be better for:**
- Request/response patterns (frontend → backend → frontend)
- Operations that need to return data
- Complex operations requiring acknowledgment

### Adding Commands in the Future

If you need to add Tauri commands:

1. **Define the command in Rust:**
   ```rust
   #[tauri::command]
   fn my_command(param: String) -> Result<String, String> {
       // Validate input
       if param.is_empty() {
           return Err("Invalid parameter".to_string());
       }
       // Process command
       Ok("Success".to_string())
   }
   ```

2. **Add to invoke_handler:**
   ```rust
   .invoke_handler(tauri::generate_handler![my_command])
   ```

3. **Add to capabilities allowlist:**
   Create a new capability file or modify `default.json`:
   ```json
   "permissions": [
     "my_command"
   ]
   ```

4. **Implement input validation:**
   - Validate all parameters in the Rust handler
   - Use strong typing for parameters
   - Return minimal data (don't expose sensitive information)

5. **Document the command:**
   - Add to this file with purpose, usage, and security implications
   - Update README.md with command documentation
   - Add to security audit checklist

6. **Test security:**
   - Test that non-allowed commands are rejected
   - Test with invalid parameters
   - Test with malicious payloads
   - Verify error handling doesn't leak information

## Security Model

### Defense-in-Depth Approach

The application implements multiple layers of security for IPC:

#### Layer 1: Capabilities (Tauri Framework)
- **What:** Tauri's built-in capability system
- **Where:** `src-tauri/capabilities/default.json`
- **Protection:** Restricts what windows can do at the framework level
- **Bypass:** Requires modifying compiled application or Tauri framework

#### Layer 2: Rust Backend Validation
- **What:** Input validation in Rust code
- **Where:** `src-tauri/src/main.rs` (lines 10-15, 137-141)
- **Protection:** Validates event IDs against allowlist before emitting
- **Bypass:** Requires modifying Rust source code and recompiling

#### Layer 3: TypeScript Frontend Validation
- **What:** Event validation in TypeScript code
- **Where:** `src/App.tsx` (lines 10-15, 153-165, 189-201)
- **Protection:** Validates event source, name, and payload before processing
- **Bypass:** Requires modifying TypeScript source code and rebuilding

#### Layer 4: Rate Limiting
- **What:** Time-based rate limiting for events
- **Where:** `src/App.tsx` (lines 51, 167-172, 203-206)
- **Protection:** Prevents abuse via rapid event triggering
- **Bypass:** Requires modifying TypeScript source code and rebuilding

### Threat Model

**What We're Protecting Against:**

#### 1. Malicious IPC Injection
- **Threat:** Attacker tries to emit crafted events to trigger unintended actions
- **Example:** Emitting `sign-out-user` event from malicious code
- **Mitigation:** Event ID allowlists, payload validation, source validation
- **Layers:** 2, 3, 4

#### 2. Privilege Escalation
- **Threat:** Malicious window tries to access capabilities it shouldn't have
- **Example:** New window trying to emit events or access dialogs
- **Mitigation:** Window restrictions in capabilities, no wildcard permissions
- **Layers:** 1

#### 3. DoS via IPC Spam
- **Threat:** Attacker floods IPC channel with events to crash or slow down app
- **Example:** Rapidly emitting `navigate-to-preferences` event
- **Mitigation:** Rate limiting, event validation, graceful error handling
- **Layers:** 3, 4

#### 4. Information Disclosure
- **Threat:** Attacker tries to extract sensitive data via IPC responses
- **Example:** Crafting events to trigger error messages with sensitive data
- **Mitigation:** Minimal data in event payloads, no sensitive data in events, error sanitization
- **Layers:** 2, 3

#### 5. Command Injection
- **Threat:** Attacker tries to execute arbitrary commands via IPC
- **Example:** Passing malicious parameters to Tauri commands
- **Mitigation:** Command allowlist, input validation, no dynamic command execution
- **Layers:** 1, 2

**What We're NOT Protecting Against:**
- Attacks requiring physical access to the machine
- Attacks requiring root/admin privileges
- Attacks on the Tauri framework itself
- Social engineering attacks
- Attacks on the Supabase backend

## Testing Capabilities

### Manual Testing

#### Test 1: Verify Window Restrictions

**Objective:** Ensure only the "main" window has capabilities

**Steps:**
1. Open the application
2. Open browser DevTools (Cmd+Option+I in development)
3. Try to emit an event from console:
   ```javascript
   window.__TAURI__.event.emit('sign-out-user', {});
   ```
4. **Expected:** Event should be rejected if not from "main" window

#### Test 2: Verify Event Validation

**Objective:** Ensure unauthorized events are rejected

**Steps:**
1. Open browser DevTools
2. Try to emit an unauthorized event:
   ```javascript
   window.__TAURI__.event.emit('malicious-event', {});
   ```
3. **Expected:** Event should be rejected and logged as security violation

#### Test 3: Verify Rate Limiting

**Objective:** Ensure rapid events are rate limited

**Steps:**
1. Click "Sign Out" menu item rapidly (multiple times per second)
2. Check console logs
3. **Expected:** Only first event processed, subsequent events rate limited

#### Test 4: Verify Payload Validation

**Objective:** Ensure invalid payloads are rejected

**Steps:**
1. Open browser DevTools
2. Try to emit event with invalid payload:
   ```javascript
   window.__TAURI__.event.emit('sign-out-user', { malicious: 'data' });
   ```
3. **Expected:** Event should be processed (payload is ignored) but logged

### Automated Testing

Consider adding integration tests for IPC security:

```typescript
// Example test structure
describe('IPC Security', () => {
  test('rejects unauthorized events', async () => {
    // Emit unauthorized event
    // Assert event was rejected
  });

  test('enforces rate limiting', async () => {
    // Emit events rapidly
    // Assert only first event processed
  });

  test('validates event source', async () => {
    // Emit event from wrong window
    // Assert event was rejected
  });
});
```

## Maintenance Guidelines

### Adding New Permissions

When adding a new permission to `default.json`:

1. **Justify the need:**
   - Why is this permission required?
   - What feature uses it?
   - Can the feature work without it?

2. **Document the permission:**
   - Add a section to this file
   - Include purpose, usage, security implications
   - Document alternatives considered

3. **Test the permission:**
   - Verify the feature works with the permission
   - Verify the feature fails without the permission
   - Test that the permission can't be abused

4. **Review security implications:**
   - What could go wrong if this permission is abused?
   - What data could be accessed?
   - What operations could be performed?

5. **Update related documentation:**
   - Update README.md if user-facing
   - Update SECURITY.md if security-relevant
   - Update PR template checklist

### Reviewing Permission Requests

When reviewing a PR that adds permissions:

- [ ] Is the permission necessary for the feature?
- [ ] Is there a more restrictive alternative?
- [ ] Is the permission documented in this file?
- [ ] Are security implications documented?
- [ ] Is the permission tested?
- [ ] Does the permission follow principle of least privilege?
- [ ] Is the permission scoped to specific windows?
- [ ] Are there validation layers for the permission's usage?

### When to Create New Capability Files

Create a new capability file when:
- Adding a new window with different permission needs
- Creating a plugin with specific permission requirements
- Separating development and production capabilities
- Implementing role-based access control

**Example:** If you add a "settings" window that needs different permissions than "main", create `settings.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "settings",
  "description": "Capability for the settings window",
  "windows": ["settings"],
  "permissions": [
    "core:window:allow-close",
    "dialog:default"
  ]
}
```

### Security Audit Checklist

Before major releases, audit capabilities:

- [ ] Review all permissions in `default.json`
- [ ] Verify each permission is still needed
- [ ] Check for overly permissive configurations
- [ ] Test that removing each permission breaks expected functionality
- [ ] Verify window restrictions are enforced
- [ ] Test event and command allowlists
- [ ] Review this documentation for accuracy
- [ ] Update threat model if needed
- [ ] Test with malicious payloads
- [ ] Verify rate limiting works correctly

## References

### Internal Documentation
- [Project README](../../README.md) - Main project documentation
- [Security Policy](../../SECURITY.md) - Security policy and vulnerability reporting
- [IPC Security Section](../../README.md#ipc--tauri-security) - Detailed IPC security documentation

### Code References
- [Rust Backend](../src/main.rs) - Menu event handler and validation
- [TypeScript Frontend](../../src/App.tsx) - Event listeners and validation
- [Capabilities Configuration](./default.json) - Actual capability definitions

### External Resources
- [Tauri Capabilities Documentation](https://tauri.app/v2/reference/capabilities/)
- [Tauri IPC Security Guide](https://tauri.app/v2/security/)
- [Tauri Security Best Practices](https://tauri.app/v2/security/best-practices/)
- [OWASP Desktop App Security](https://owasp.org/www-project-desktop-app-security-top-10/)

---

**Last Updated:** 2025-01-11

**Maintained By:** Development Team

**Review Frequency:** Before each major release and after any IPC-related changes
