# KhaataX v0.1.2 Bug Fix Plan

## Critical Issues Identified

### 1. **License Verification Missing** ❌
- **Problem**: No license check in App.tsx
- **Impact**: Anyone can use the app without a license
- **Fix**: Add LicenseGate component before app loads

### 2. **Export Functionality Broken** ❌
- **Problem**: File save dialog opens but files don't save
- **Root Cause**: Tauri permissions might not be correctly configured OR path handling issue
- **Fix**: 
  - Add comprehensive error logging
  - Use BaseDirectory for proper path resolution
  - Add success/failure toast notifications

### 3. **Online/Offline Status Always Shows "Live"** ❌
- **Problem**: `navigator.onLine` doesn't work in Tauri desktop apps
- **Root Cause**: Tauri uses custom protocol (tauri://), not http://
- **Fix**: Implement actual network check (ping a known server or disable feature in desktop)

### 4. **Google Drive Connection Fails** ❌
- **Problem**: OAuth redirect_uri_mismatch
- **Root Cause**: Desktop apps can't use localhost redirects properly
- **Options**:
  - A) Use device code flow (better for desktop)
  - B) Remove Google Drive from desktop, keep for web only
  - C) Use Tauri's custom protocol handler
- **Recommended**: Option B for v0.1.2 (simplest)

## Implementation Order

1. ✅ Add License Verification
2. ✅ Fix Export with proper error handling
3. ✅ Fix/Disable online status in Tauri
4. ✅ Disable Google Drive in desktop (note in UI)
5. ✅ Test changes locally
6. ✅ Deploy web version for testing
7. ✅ Create new tagged release

## Testing Checklist

- [ ] License verification works (valid/invalid keys)
- [ ] CSV export saves file successfully
- [ ] PDF export saves file successfully  
- [ ] Online/offline indicator correct
- [ ] Google Drive hidden in desktop app
- [ ] All features work offline
- [ ] Local backup works
- [ ] App loads without errors
