# KhaataX Licensing System

## Overview
This system implements device-locked licensing for the KhaataX Windows desktop application. Each installation requires a unique license key that is tied to the customer's hardware.

## How It Works

### 1. Customer Installs the App
When the customer runs KhaataX for the first time:
- The app generates a unique **System ID** based on their hardware
- An **Activation Screen** appears showing their System ID
- The app is locked until they enter a valid License Key

### 2. You Generate a License Key
1. Open `admin-license-generator.html` in any web browser
2. Enter the customer's **System ID** (they will send this to you)
3. Verify the **Master Secret** matches your app (default: `KhaataX-2026-SecretKey-ChangeMe`)
4. Click **Generate License Key**
5. Copy the generated key (format: `XXXX-XXXX-XXXX-XXXX`)
6. Send it to the customer

### 3. Customer Activates
- Customer enters the License Key in the Activation Screen
- App verifies the key matches their System ID
- If valid, the app unlocks and stores the license permanently
- The app will not ask for activation again on that machine

## Security Features

✅ **Hardware-Locked**: License keys only work on the specific machine they were generated for  
✅ **Offline Verification**: No internet required - verification happens locally  
✅ **Persistent**: License survives app reinstallation (stored in AppData)  
✅ **Tamper-Resistant**: Secret key is embedded in compiled Rust binary  

## Important Files

- `src-tauri/src/lib.rs` - Contains the license verification logic and **MASTER_SECRET**
- `src/services/license.ts` - Frontend license service
- `src/components/ActivationScreen.tsx` - Activation UI
- `admin-license-generator.html` - **Admin tool for generating keys** (KEEP SECURE!)

## Changing the Master Secret

⚠️ **IMPORTANT**: Before building your production app, change the secret key!

1. Open `src-tauri/src/lib.rs`
2. Find this line:
   ```rust
   const MASTER_SECRET: &str = "KhaataX-2026-SecretKey-ChangeMe";
   ```
3. Change it to your own secret (e.g., `"MyCompany-2026-SuperSecretKey-XYZ123"`)
4. Open `admin-license-generator.html`
5. Update the default value in the Master Secret input field to match

## Testing the System

### In Development (Browser)
- The licensing system is **disabled** when running in browser (`npm run dev`)
- You can test the full app without activation

### In Production (Windows .exe)
1. Build the app: `npm run tauri build`
2. Install the `.exe` on a test machine
3. Note the System ID shown on the Activation Screen
4. Use `admin-license-generator.html` to generate a key
5. Enter the key to activate

## Troubleshooting

**Q: Customer says "Invalid license key"**
- Verify you copied the System ID correctly (no extra spaces)
- Ensure the Master Secret in the admin tool matches the app
- Check that the license key was copied completely

**Q: License doesn't persist after restart**
- This is a bug - check that Tauri has write permissions to AppData
- Verify `tauri-plugin-fs` is properly configured

**Q: Can I generate keys in bulk?**
- Yes! You can modify `admin-license-generator.html` to accept a CSV of System IDs
- Or create a Node.js script using the same SHA-256 algorithm

## Windows Compatibility

✅ **Supported**: Windows 7 (with updates), 8, 10, 11  
❌ **Not Supported**: Windows XP, Vista (WebView2 requirement)

## Next Steps

- [ ] Change the `MASTER_SECRET` before production build
- [ ] Test activation on a clean Windows machine
- [ ] Secure the `admin-license-generator.html` file (don't share with customers)
- [ ] Consider adding license expiration dates (future enhancement)
- [ ] Build the `.exe` installer: `npm run tauri build`
