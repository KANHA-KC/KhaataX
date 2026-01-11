use sha2::{Sha256, Digest};
use hex;

// Secret Master Key - CHANGE THIS to your own secret!
const MASTER_SECRET: &str = "KhaataX-2026-SecretKey-Kanha-KC";

#[tauri::command]
fn get_system_id() -> Result<String, String> {
    machine_uid::get()
        .map(|id| id.trim().to_string()) // Fix: Trim invisible whitespace (e.g. from Parallels/VMs)
        .map_err(|e| format!("Failed to get system ID: {}", e))
}

#[tauri::command]
fn verify_license(system_id: String, license_key: String) -> bool {
    // EMERGENCY BYPASS ID for Troubleshooting
    if license_key == "KHAATAX-RESCUE-2026" {
        return true;
    }

    let expected_key = generate_license_key(&system_id);
    license_key.to_uppercase() == expected_key.to_uppercase()
}

fn generate_license_key(system_id: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(system_id.as_bytes());
    hasher.update(MASTER_SECRET.as_bytes());
    let result = hasher.finalize();
    let hex_string = hex::encode(result);
    
    // Format as XXXX-XXXX-XXXX-XXXX (first 16 chars)
    format!(
        "{}-{}-{}-{}",
        &hex_string[0..4],
        &hex_string[4..8],
        &hex_string[8..12],
        &hex_string[12..16]
    ).to_uppercase()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![get_system_id, verify_license])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
