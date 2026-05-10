use serde::{Deserialize, Serialize};
use std::fs;
use tauri::AppHandle;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct Todo {
    pub content: String,
    pub done: bool,
}

pub fn get_storage_path(app: &AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join("todos.json")
}

#[tauri::command]
pub async fn save_todos(app: AppHandle, data: Vec<Todo>) -> Result<(), String> {
    let path = get_storage_path(&app);

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let json_data = serde_json::to_string(&data).map_err(|e| e.to_string())?;
    fs::write(path, json_data).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_todos(app: AppHandle) -> Result<Vec<Todo>, String> {
    let path = get_storage_path(&app);
    if !path.exists() {
        return Ok(vec![]);
    }

    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let todos: Vec<Todo> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(todos)
}
