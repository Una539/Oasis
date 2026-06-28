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
use specta::Type;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use tauri::Manager;
use tauri::{AppHandle, State};

static ID_COUNTER: AtomicU64 = AtomicU64::new(0);

fn generate_id() -> String {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let counter = ID_COUNTER.fetch_add(1, Ordering::SeqCst);
    format!("todo-{}-{}", timestamp, counter)
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Todo {
    pub id: String,
    pub content: String,
    pub done: bool,
    pub due_date: Option<String>,
}

#[derive(Debug)]
pub struct TodoCache {
    pub todos: Mutex<Option<Vec<Todo>>>,
}

pub fn get_storage_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取数据目录: {}", e))?;
    Ok(dir.join("todos.json"))
}

fn load_from_disk(path: &PathBuf) -> Result<Vec<Todo>, String> {
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let mut todos: Vec<Todo> = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    for todo in todos.iter_mut() {
        if todo.id.is_empty() {
            todo.id = generate_id();
        }
    }
    Ok(todos)
}

pub fn save_to_disk(path: &PathBuf, todos: &[Todo]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string(todos).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

fn save_current_todos(app: &AppHandle, todos: &[Todo]) -> Result<(), String> {
    let path = get_storage_path(app)?;
    save_to_disk(&path, todos)
}

#[tauri::command]
#[specta::specta]
pub async fn load_todos(app: AppHandle, cache: State<'_, TodoCache>) -> Result<Vec<Todo>, String> {
    let mut todos = cache.todos.lock().map_err(|e| e.to_string())?;

    match &*todos {
        None => {
            let path = get_storage_path(&app)?;
            let loaded = load_from_disk(&path)?;
            *todos = Some(loaded.clone());
            Ok(loaded)
        }
        Some(vec) => Ok(vec.clone()),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn add_todo(
    app: AppHandle,
    cache: State<'_, TodoCache>,
    content: String,
    due_date: Option<String>,
) -> Result<Vec<Todo>, String> {
    let id = generate_id();

    let mut todos_guard = cache.todos.lock().map_err(|e| e.to_string())?;

    let todos = todos_guard.get_or_insert_with(Vec::new);
    todos.push(Todo {
        id,
        content,
        done: false,
        due_date,
    });

    save_current_todos(&app, todos)?;
    Ok(todos.clone())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_todo(
    app: AppHandle,
    cache: State<'_, TodoCache>,
    id: String,
) -> Result<Vec<Todo>, String> {
    let mut todos_guard = cache.todos.lock().map_err(|e| e.to_string())?;

    let todos = todos_guard.get_or_insert_with(Vec::new);

    todos.retain(|t| t.id != id);
    save_current_todos(&app, todos)?;
    Ok(todos.clone())
}

#[tauri::command]
#[specta::specta]
pub async fn toggle_todo(
    app: AppHandle,
    cache: State<'_, TodoCache>,
    id: String,
) -> Result<Vec<Todo>, String> {
    let mut todos_guard = cache.todos.lock().map_err(|e| e.to_string())?;

    let todos = todos_guard.get_or_insert_with(Vec::new);
    if let Some(todo) = todos.iter_mut().find(|t| t.id == id) {
        todo.done = !todo.done;
    }

    save_current_todos(&app, todos)?;
    Ok(todos.clone())
}

#[tauri::command]
#[specta::specta]
pub async fn update_todo_content(
    app: AppHandle,
    cache: State<'_, TodoCache>,
    id: String,
    content: String,
) -> Result<Vec<Todo>, String> {
    let mut todos_guard = cache.todos.lock().map_err(|e| e.to_string())?;

    let todos = todos_guard.get_or_insert_with(Vec::new);

    if let Some(todo) = todos.iter_mut().find(|t| t.id == id) {
        todo.content = content;
    }

    save_current_todos(&app, todos)?;
    Ok(todos.clone())
}

#[tauri::command]
#[specta::specta]
pub async fn update_todo_due_date(
    app: AppHandle,
    cache: State<'_, TodoCache>,
    id: String,
    due_date: Option<String>,
) -> Result<Vec<Todo>, String> {
    let mut todos_guard = cache.todos.lock().map_err(|e| e.to_string())?;

    let todos = todos_guard.get_or_insert_with(Vec::new);

    if let Some(todo) = todos.iter_mut().find(|t| t.id == id) {
        todo.due_date = due_date;
    }

    save_current_todos(&app, todos)?;
    Ok(todos.clone())
}
