// Oasis - A simple Todo List app built with Tauri, SolidJS and Rust.
// Copyright (C) 2026 Uno
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use serde::{Deserialize, Serialize};
use std::fs;
use tauri::AppHandle;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct Todo {
    pub content: String,
    pub done: bool,
}

pub fn get_storage_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| format!("无法获取数据目录: {}", e))?;
    Ok(dir.join("todos.json"))
}

#[tauri::command]
pub async fn save_todos(app: AppHandle, data: Vec<Todo>) -> Result<(), String> {
    let path = get_storage_path(&app)?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let json_data = serde_json::to_string(&data).map_err(|e| e.to_string())?;
    fs::write(path, json_data).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_todos(app: AppHandle) -> Result<Vec<Todo>, String> {
    let path = get_storage_path(&app)?;
    if !path.exists() {
        return Ok(vec![]);
    }

    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let todos: Vec<Todo> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(todos)
}
