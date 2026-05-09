// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::env;
use std::fs;
use tauri::AppHandle;
use tauri::Manager;

fn get_storage_path(app: &AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join("todos.json")
}

#[tauri::command]
async fn save_todos(app: AppHandle, data: String) -> Result<(), String> {
    let path = get_storage_path(&app);

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
async fn load_todos(app: AppHandle) -> Result<String, String> {
    let path = get_storage_path(&app);
    if !path.exists() {
        return Ok("[]".to_string());
    }
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if cfg!(target_os = "linux") && env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
        env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        println!("Linux detected: set WEBKIT_DISABLE_DMABUF_RENDERER=1");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![save_todos, load_todos])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
