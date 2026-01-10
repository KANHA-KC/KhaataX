# Building KhaataX v0.1.0 Windows Installer

## ⚠️ Important: Cross-Platform Build Limitation

You are currently on **macOS**. Building a Windows `.exe` installer requires either:

### Option A: Build on Windows (Recommended)
1. Copy this project to a Windows machine
2. Install prerequisites on Windows:
   - [Node.js](https://nodejs.org/) (v18 or later)
   - [Rust](https://www.rust-lang.org/tools/install)
   - [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)
3. Run the build commands below

### Option B: Use GitHub Actions (Cloud Build)
Set up a GitHub Actions workflow to build for Windows automatically.

---

## Build Instructions (On Windows)

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Installer
```bash
npm run tauri:build
```

This will:
- Compile the Rust backend
- Bundle the React frontend
- Create a Windows installer (`.msi` and `.exe`)

### 3. Find Your Installer
The installer will be created in:
```
src-tauri/target/release/bundle/
├── msi/
│   └── KhaataX_0.1.0_x64_en-US.msi  ← Windows Installer
└── nsis/
    └── KhaataX_0.1.0_x64-setup.exe  ← Portable Installer
```

---

## What Gets Built

### KhaataX_0.1.0_x64-setup.exe
- **Size**: ~5-10 MB
- **Type**: NSIS Installer
- **Features**:
  - Installs to `C:\Program Files\KhaataX`
  - Creates Start Menu shortcut
  - Adds to Windows Programs list
  - Uninstaller included

### KhaataX_0.1.0_x64_en-US.msi
- **Size**: ~5-10 MB
- **Type**: Windows Installer Package
- **Features**:
  - Enterprise-friendly
  - Silent install support
  - Better for corporate environments

---

## Testing the Installer

1. **Install on a clean Windows machine**
2. **Run KhaataX** from Start Menu
3. **Activation Screen should appear** showing System ID
4. **Use admin-license-generator.html** to create a license key
5. **Enter the key** to activate
6. **Complete onboarding** (name, currency, optional PIN)
7. **Test all features**:
   - Add transactions
   - Create categories
   - Backup to Google Drive
   - Local file backup (Documents folder)

---

## Build Troubleshooting

### Error: "Rust not found"
Install Rust: https://www.rust-lang.org/tools/install

### Error: "MSVC build tools not found"
Install Visual Studio Build Tools:
https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022

### Error: "WebView2 not found"
Windows 10/11 includes WebView2 by default.
For Windows 7/8, users need to install: https://developer.microsoft.com/en-us/microsoft-edge/webview2/

### Build is very slow
First build takes 5-15 minutes (Rust compilation).
Subsequent builds are much faster (~2-3 minutes).

---

## Distribution Checklist

Before distributing to customers:

- [ ] Change `MASTER_SECRET` in `src-tauri/src/lib.rs`
- [ ] Update `admin-license-generator.html` with the same secret
- [ ] Test activation on a clean Windows machine
- [ ] Verify local backups work (Documents folder)
- [ ] Test Google Drive sync
- [ ] Verify PIN lock works
- [ ] Check that license persists after app restart
- [ ] Test uninstall/reinstall (license should persist)

---

## Next Release (v0.2.0)

Planned features:
- Multi-currency support
- Advanced reporting
- PDF invoice generation
- Mobile sync (Supabase backend)
- Pagination for large datasets

---

## Support

If customers report issues:
1. Check Windows version (must be 7+)
2. Verify WebView2 is installed
3. Check antivirus isn't blocking the app
4. Verify license key was entered correctly
5. Check AppData folder permissions
