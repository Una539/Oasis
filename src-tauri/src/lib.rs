// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod store;

use std::env;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if cfg!(target_os = "linux") && env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
        env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        println!("Linux detected: set WEBKIT_DISABLE_DMABUF_RENDERER=1");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            store::save_todos,
            store::load_todos
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
