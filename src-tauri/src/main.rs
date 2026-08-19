// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;

/// Helper to get the portable data directory beside the running executable
fn get_portable_dir() -> Result<PathBuf, String> {
    let exe_path = std::env::current_exe().map_err(|e| format!("Failed to get executable path: {}", e))?;
    let exe_dir = exe_path
        .parent()
        .ok_or_else(|| "Failed to get executable parent directory".to_string())?;
    
    let data_dir = exe_dir.join("payroll_data");
    if !data_dir.exists() {
        fs::create_dir_all(&data_dir).map_err(|e| format!("Failed to create data directory: {}", e))?;
    }
    Ok(data_dir)
}

#[tauri::command]
fn get_portable_data_path() -> Result<String, String> {
    let dir = get_portable_dir()?;
    let file = dir.join("payroll_master_db.json");
    Ok(file.to_string_lossy().to_string())
}

#[tauri::command]
fn check_portable_data_exists(filename: Option<String>) -> Result<bool, String> {
    let dir = get_portable_dir()?;
    let fname = filename.unwrap_or_else(|| "payroll_master_db.json".to_string());
    let file = dir.join(fname);
    Ok(file.exists())
}

#[tauri::command]
fn save_portable_data(content: String, filename: Option<String>) -> Result<bool, String> {
    let dir = get_portable_dir()?;
    let fname = filename.unwrap_or_else(|| "payroll_master_db.json".to_string());
    let file_path = dir.join(fname);
    
    // Write directly to file beside the executable
    fs::write(&file_path, content).map_err(|e| format!("Failed to write portable data to {:?}: {}", file_path, e))?;
    Ok(true)
}

#[tauri::command]
fn load_portable_data(filename: Option<String>) -> Result<String, String> {
    let dir = get_portable_dir()?;
    let fname = filename.unwrap_or_else(|| "payroll_master_db.json".to_string());
    let file_path = dir.join(fname);
    
    if !file_path.exists() {
        return Err(format!("File not found: {:?}", file_path));
    }
    
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read portable data from {:?}: {}", file_path, e))?;
    Ok(content)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_portable_data_path,
            check_portable_data_exists,
            save_portable_data,
            load_portable_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
