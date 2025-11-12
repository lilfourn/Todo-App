# Auto-Updater Setup Complete

## Setup Summary

Auto-update system configured. App checks for updates on startup and notifies users when new version available.

## GitHub Secrets Required

Add these to repository Settings → Secrets and variables → Actions:

### 1. TAURI_SIGNING_PRIVATE_KEY
Read private key:
```bash
cat ~/.tauri/todoapp.key
```
Copy entire contents to secret value

### 2. TAURI_SIGNING_PRIVATE_KEY_PASSWORD
```
Ybgy9R1FqRZ2l8Wwmswmr7IX1Wc1WGhzd7EDzmWX7IE=
```

### 3. VITE_SUPABASE_URL
Your Supabase project URL (if not already added)

### 4. VITE_SUPABASE_ANON_KEY
Your Supabase anonymous key (if not already added)

## Release Process

1. Update version in all files to same number (e.g., 1.0.1):
   - `package.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/tauri.conf.json`

2. Commit and push to main:
   ```bash
   git add .
   git commit -m "v1.0.1"
   git push
   ```

3. GitHub Actions automatically:
   - Builds for Intel & Apple Silicon
   - Signs binaries
   - Creates GitHub release
   - Generates `latest.json`

4. Users automatically notified of update on next app launch

## Testing

1. Install current release (v1.0.0)
2. Create new release (v1.0.1)
3. Launch app - should show update dialog
4. Click "Update" - app downloads, installs, restarts

## Key Files Modified

- `src-tauri/Cargo.toml` - Added updater & process plugins
- `package.json` - Added @tauri-apps/plugin-updater & plugin-process
- `src-tauri/tauri.conf.json` - Configured updater endpoint & pubkey
- `src-tauri/capabilities/default.json` - Added updater permissions
- `src-tauri/src/main.rs` - Initialized plugins
- `src/lib/updater.ts` - Update check logic
- `src/main.tsx` - Integrated update check on startup
- `.github/workflows/publish.yml` - CI/CD pipeline

## Public Key
```
dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEQ2NzU2QjAwODlCRTdGMDgKUldRSWY3NkpBR3QxMWp5N3JWb0RCTkNmd0dBQlpvQkMwMG9VZVBLdG1obm1FSEdoa2VXcnJPQVYK
```

## Endpoint
```
https://github.com/lilfourn/Todo-App/releases/latest/download/latest.json
```

## Important Notes

- Keep private key (`~/.tauri/todoapp.key`) secure - back up in password manager
- Never commit private key to git
- Losing key or password = cannot sign updates = users cannot update
- Version must increment for updates to work
- GitHub Actions requires all 4 secrets configured
