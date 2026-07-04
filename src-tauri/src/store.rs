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
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use tauri::Manager;
use tauri::{AppHandle, State};

use crate::input_parser::{
    build_tag_input_analysis, parse_content_tags, remove_mention_from_value,
    ApplyTagSuggestionResult, TagInputAnalysis, TagSuggestionAction,
};

const SCHEMA_VERSION: u32 = 2;
const DEFAULT_PRIORITY: u8 = 3;
const DEFAULT_TAG_COLOR: &str = "#d97757";
const STORAGE_FILE: &str = "todos.json";
const LEGACY_IDENTIFIER: &str = "com.oasis.app";

static ID_COUNTER: AtomicU64 = AtomicU64::new(0);

fn generate_id(prefix: &str) -> String {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let counter = ID_COUNTER.fetch_add(1, Ordering::SeqCst);
    format!("{}-{}-{}", prefix, timestamp, counter)
}

fn default_schema_version() -> u32 {
    SCHEMA_VERSION
}

fn default_priority() -> u8 {
    DEFAULT_PRIORITY
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Todo {
    pub id: String,
    pub content: String,
    pub done: bool,
    pub due_date: Option<String>,
    #[serde(default = "default_priority")]
    pub priority: u8,
    #[serde(default)]
    pub tag_ids: Vec<String>,
    #[serde(default)]
    pub reminder_enabled: bool,
    #[serde(default)]
    pub completed_at: Option<String>,
    #[serde(default)]
    pub last_notified_on: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct AppState {
    #[serde(default = "default_schema_version")]
    pub schema_version: u32,
    #[serde(default)]
    pub todos: Vec<Todo>,
    #[serde(default)]
    pub tags: Vec<Tag>,
}

#[derive(Debug)]
pub struct TodoCache {
    pub state: Mutex<Option<AppState>>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum StoredData {
    Versioned(AppState),
    LegacyTodos(Vec<Todo>),
}

pub fn get_storage_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取数据目录: {}", e))?;
    Ok(dir.join(STORAGE_FILE))
}

fn get_legacy_storage_path(current_path: &Path) -> Option<PathBuf> {
    let current_dir = current_path.parent()?;
    let app_data_root = current_dir.parent()?;

    Some(app_data_root.join(LEGACY_IDENTIFIER).join(STORAGE_FILE))
}

fn normalize_todo(todo: &mut Todo) {
    if todo.id.is_empty() {
        todo.id = generate_id("todo");
    }

    todo.priority = todo.priority.clamp(1, 5);

    if !todo.done {
        todo.completed_at = None;
    }
}

fn normalize_state(mut state: AppState) -> AppState {
    state.schema_version = SCHEMA_VERSION;

    for todo in state.todos.iter_mut() {
        normalize_todo(todo);
    }

    for tag in state.tags.iter_mut() {
        if tag.id.is_empty() {
            tag.id = generate_id("tag");
        }
    }

    let tag_ids: std::collections::HashSet<&str> =
        state.tags.iter().map(|tag| tag.id.as_str()).collect();

    for todo in state.todos.iter_mut() {
        todo.tag_ids
            .retain(|tag_id| tag_ids.contains(tag_id.as_str()));
    }

    state
}

fn load_from_disk(path: &PathBuf) -> Result<AppState, String> {
    if !path.exists() {
        return Ok(AppState {
            schema_version: SCHEMA_VERSION,
            todos: vec![],
            tags: vec![],
        });
    }

    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let stored: StoredData = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let state = match stored {
        StoredData::Versioned(state) => state,
        StoredData::LegacyTodos(todos) => AppState {
            schema_version: SCHEMA_VERSION,
            todos,
            tags: vec![],
        },
    };

    Ok(normalize_state(state))
}

fn load_from_storage(app: &AppHandle) -> Result<AppState, String> {
    let path = get_storage_path(app)?;
    if path.exists() {
        return load_from_disk(&path);
    }

    if let Some(legacy_path) = get_legacy_storage_path(&path) {
        if legacy_path != path && legacy_path.exists() {
            let state = load_from_disk(&legacy_path)?;
            save_to_disk(&path, &state)?;
            return Ok(state);
        }
    }

    load_from_disk(&path)
}

pub fn save_to_disk(path: &PathBuf, state: &AppState) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(state).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

fn save_current_state(app: &AppHandle, state: &AppState) -> Result<(), String> {
    let path = get_storage_path(app)?;
    save_to_disk(&path, state)
}

fn state_from_cache<'a>(
    cache: &'a State<'_, TodoCache>,
) -> Result<std::sync::MutexGuard<'a, Option<AppState>>, String> {
    cache.state.lock().map_err(|e| e.to_string())
}

fn tag_id_for_name(state: &mut AppState, name: &str) -> String {
    if let Some(existing) = state
        .tags
        .iter()
        .find(|tag| tag.name.eq_ignore_ascii_case(name))
    {
        return existing.id.clone();
    }

    let tag = Tag {
        id: generate_id("tag"),
        name: name.to_string(),
        color: DEFAULT_TAG_COLOR.to_string(),
    };
    let id = tag.id.clone();
    state.tags.push(tag);
    id
}

fn normalize_tag_ids(state: &AppState, tag_ids: Vec<String>) -> Vec<String> {
    let known_tag_ids: std::collections::HashSet<&str> =
        state.tags.iter().map(|tag| tag.id.as_str()).collect();
    tag_ids
        .into_iter()
        .filter(|tag_id| known_tag_ids.contains(tag_id.as_str()))
        .fold(Vec::new(), |mut ids, tag_id| {
            if !ids.iter().any(|id| id == &tag_id) {
                ids.push(tag_id);
            }
            ids
        })
}

fn parse_content_and_tags(
    state: &mut AppState,
    content: String,
    base_tag_ids: Vec<String>,
) -> (String, Vec<String>) {
    let parsed = parse_content_tags(&content);
    let mut tag_ids = normalize_tag_ids(state, base_tag_ids);

    for name in parsed.tag_names {
        let tag_id = tag_id_for_name(state, &name);
        if !tag_ids.iter().any(|id| id == &tag_id) {
            tag_ids.push(tag_id);
        }
    }

    (parsed.content, tag_ids)
}

#[tauri::command]
#[specta::specta]
pub async fn load_app_state(
    app: AppHandle,
    cache: State<'_, TodoCache>,
) -> Result<AppState, String> {
    let mut state = state_from_cache(&cache)?;

    match &*state {
        None => {
            let loaded = load_from_storage(&app)?;
            *state = Some(loaded.clone());
            Ok(loaded)
        }
        Some(state) => Ok(state.clone()),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn add_todo(
    app: AppHandle,
    cache: State<'_, TodoCache>,
    content: String,
    due_date: Option<String>,
    tag_ids: Vec<String>,
) -> Result<AppState, String> {
    let id = generate_id("todo");

    let mut state_guard = state_from_cache(&cache)?;

    let state = state_guard.get_or_insert_with(|| AppState {
        schema_version: SCHEMA_VERSION,
        todos: vec![],
        tags: vec![],
    });
    let (content, tag_ids) = parse_content_and_tags(state, content, tag_ids);
    if content.trim().is_empty() {
        return Err("待办内容不能为空".to_string());
    }

    state.todos.push(Todo {
        id,
        content,
        done: false,
        due_date,
        priority: DEFAULT_PRIORITY,
        tag_ids,
        reminder_enabled: false,
        completed_at: None,
        last_notified_on: None,
    });

    save_current_state(&app, state)?;
    Ok(state.clone())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_todo(
    app: AppHandle,
    cache: State<'_, TodoCache>,
    id: String,
) -> Result<AppState, String> {
    let mut state_guard = state_from_cache(&cache)?;

    let state = state_guard.get_or_insert_with(|| AppState {
        schema_version: SCHEMA_VERSION,
        todos: vec![],
        tags: vec![],
    });

    state.todos.retain(|t| t.id != id);
    save_current_state(&app, state)?;
    Ok(state.clone())
}

#[tauri::command]
#[specta::specta]
pub async fn toggle_todo(
    app: AppHandle,
    cache: State<'_, TodoCache>,
    id: String,
    completed_at: Option<String>,
) -> Result<AppState, String> {
    let mut state_guard = state_from_cache(&cache)?;

    let state = state_guard.get_or_insert_with(|| AppState {
        schema_version: SCHEMA_VERSION,
        todos: vec![],
        tags: vec![],
    });
    if let Some(todo) = state.todos.iter_mut().find(|t| t.id == id) {
        todo.done = !todo.done;
        todo.completed_at = if todo.done { completed_at } else { None };
    }

    save_current_state(&app, state)?;
    Ok(state.clone())
}

#[tauri::command]
#[specta::specta]
pub async fn update_todo_content(
    app: AppHandle,
    cache: State<'_, TodoCache>,
    id: String,
    content: String,
) -> Result<AppState, String> {
    let mut state_guard = state_from_cache(&cache)?;

    let state = state_guard.get_or_insert_with(|| AppState {
        schema_version: SCHEMA_VERSION,
        todos: vec![],
        tags: vec![],
    });

    let existing_tag_ids = state
        .todos
        .iter()
        .find(|todo| todo.id == id)
        .map(|todo| todo.tag_ids.clone())
        .unwrap_or_default();
    let (content, tag_ids) = parse_content_and_tags(state, content, existing_tag_ids);

    if let Some(todo) = state.todos.iter_mut().find(|todo| todo.id == id) {
        todo.content = content;
        todo.tag_ids = tag_ids;
    }

    save_current_state(&app, state)?;
    Ok(state.clone())
}

#[tauri::command]
#[specta::specta]
pub async fn update_todo_due_date(
    app: AppHandle,
    cache: State<'_, TodoCache>,
    id: String,
    due_date: Option<String>,
) -> Result<AppState, String> {
    let mut state_guard = state_from_cache(&cache)?;

    let state = state_guard.get_or_insert_with(|| AppState {
        schema_version: SCHEMA_VERSION,
        todos: vec![],
        tags: vec![],
    });

    if let Some(todo) = state.todos.iter_mut().find(|t| t.id == id) {
        todo.due_date = due_date;
        todo.last_notified_on = None;
    }

    save_current_state(&app, state)?;
    Ok(state.clone())
}

#[tauri::command]
#[specta::specta]
pub async fn update_todo_priority(
    app: AppHandle,
    cache: State<'_, TodoCache>,
    id: String,
    priority: u8,
) -> Result<AppState, String> {
    let mut state_guard = state_from_cache(&cache)?;
    let state = state_guard.get_or_insert_with(|| AppState {
        schema_version: SCHEMA_VERSION,
        todos: vec![],
        tags: vec![],
    });

    if let Some(todo) = state.todos.iter_mut().find(|t| t.id == id) {
        todo.priority = priority.clamp(1, 5);
    }

    save_current_state(&app, state)?;
    Ok(state.clone())
}

#[tauri::command]
#[specta::specta]
pub async fn update_todo_tags(
    app: AppHandle,
    cache: State<'_, TodoCache>,
    id: String,
    tag_ids: Vec<String>,
) -> Result<AppState, String> {
    let mut state_guard = state_from_cache(&cache)?;
    let state = state_guard.get_or_insert_with(|| AppState {
        schema_version: SCHEMA_VERSION,
        todos: vec![],
        tags: vec![],
    });
    let known_tag_ids: std::collections::HashSet<&str> =
        state.tags.iter().map(|tag| tag.id.as_str()).collect();

    if let Some(todo) = state.todos.iter_mut().find(|t| t.id == id) {
        todo.tag_ids = tag_ids
            .into_iter()
            .filter(|tag_id| known_tag_ids.contains(tag_id.as_str()))
            .collect();
    }

    save_current_state(&app, state)?;
    Ok(state.clone())
}

#[tauri::command]
#[specta::specta]
pub async fn update_todo_reminder(
    app: AppHandle,
    cache: State<'_, TodoCache>,
    id: String,
    reminder_enabled: bool,
) -> Result<AppState, String> {
    let mut state_guard = state_from_cache(&cache)?;
    let state = state_guard.get_or_insert_with(|| AppState {
        schema_version: SCHEMA_VERSION,
        todos: vec![],
        tags: vec![],
    });

    if let Some(todo) = state.todos.iter_mut().find(|t| t.id == id) {
        todo.reminder_enabled = reminder_enabled;
        if !reminder_enabled {
            todo.last_notified_on = None;
        }
    }

    save_current_state(&app, state)?;
    Ok(state.clone())
}

#[tauri::command]
#[specta::specta]
pub async fn mark_todo_notified(
    app: AppHandle,
    cache: State<'_, TodoCache>,
    id: String,
    notified_on: String,
) -> Result<AppState, String> {
    let mut state_guard = state_from_cache(&cache)?;
    let state = state_guard.get_or_insert_with(|| AppState {
        schema_version: SCHEMA_VERSION,
        todos: vec![],
        tags: vec![],
    });

    if let Some(todo) = state.todos.iter_mut().find(|t| t.id == id) {
        todo.last_notified_on = Some(notified_on);
    }

    save_current_state(&app, state)?;
    Ok(state.clone())
}

#[tauri::command]
#[specta::specta]
pub async fn analyze_tag_input(
    cache: State<'_, TodoCache>,
    value: String,
    caret: u32,
    selected_tag_ids: Vec<String>,
) -> Result<TagInputAnalysis, String> {
    let state_guard = state_from_cache(&cache)?;
    let tags = state_guard
        .as_ref()
        .map(|state| state.tags.as_slice())
        .unwrap_or(&[]);

    Ok(build_tag_input_analysis(
        &value,
        caret,
        &selected_tag_ids,
        tags,
    ))
}

#[tauri::command]
#[specta::specta]
pub async fn apply_tag_suggestion(
    app: AppHandle,
    cache: State<'_, TodoCache>,
    value: String,
    selected_tag_ids: Vec<String>,
    token_start: u32,
    token_end: u32,
    action: TagSuggestionAction,
) -> Result<ApplyTagSuggestionResult, String> {
    let mut state_guard = state_from_cache(&cache)?;
    let state = state_guard.get_or_insert_with(|| AppState {
        schema_version: SCHEMA_VERSION,
        todos: vec![],
        tags: vec![],
    });

    let tag = match action.kind.as_str() {
        "existing" => {
            let Some(tag_id) = action.tag_id else {
                return Err("缺少标签 ID".to_string());
            };
            state
                .tags
                .iter()
                .find(|tag| tag.id == tag_id)
                .cloned()
                .ok_or_else(|| "标签不存在".to_string())?
        }
        "create" => {
            let name = action.name.trim();
            if name.is_empty() {
                return Err("标签名称不能为空".to_string());
            }

            if let Some(existing) = state
                .tags
                .iter()
                .find(|tag| tag.name.eq_ignore_ascii_case(name))
                .cloned()
            {
                existing
            } else {
                let tag = Tag {
                    id: generate_id("tag"),
                    name: name.to_string(),
                    color: DEFAULT_TAG_COLOR.to_string(),
                };
                state.tags.push(tag.clone());
                tag
            }
        }
        _ => return Err("未知标签操作".to_string()),
    };

    let mut tag_ids = selected_tag_ids;
    if !tag_ids.iter().any(|id| id == &tag.id) {
        tag_ids.push(tag.id);
    }

    let known_tag_ids: std::collections::HashSet<&str> =
        state.tags.iter().map(|tag| tag.id.as_str()).collect();
    tag_ids.retain(|tag_id| known_tag_ids.contains(tag_id.as_str()));

    let (value, caret) = remove_mention_from_value(&value, token_start, token_end);
    save_current_state(&app, state)?;

    Ok(ApplyTagSuggestionResult {
        value,
        tag_ids,
        caret,
        app_state: state.clone(),
    })
}

#[tauri::command]
#[specta::specta]
pub async fn create_tag(
    app: AppHandle,
    cache: State<'_, TodoCache>,
    name: String,
    color: String,
) -> Result<AppState, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("标签名称不能为空".to_string());
    }

    let mut state_guard = state_from_cache(&cache)?;
    let state = state_guard.get_or_insert_with(|| AppState {
        schema_version: SCHEMA_VERSION,
        todos: vec![],
        tags: vec![],
    });

    state.tags.push(Tag {
        id: generate_id("tag"),
        name: trimmed.to_string(),
        color,
    });

    save_current_state(&app, state)?;
    Ok(state.clone())
}

#[tauri::command]
#[specta::specta]
pub async fn update_tag(
    app: AppHandle,
    cache: State<'_, TodoCache>,
    id: String,
    name: String,
    color: String,
) -> Result<AppState, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("标签名称不能为空".to_string());
    }

    let mut state_guard = state_from_cache(&cache)?;
    let state = state_guard.get_or_insert_with(|| AppState {
        schema_version: SCHEMA_VERSION,
        todos: vec![],
        tags: vec![],
    });

    if let Some(tag) = state.tags.iter_mut().find(|tag| tag.id == id) {
        tag.name = trimmed.to_string();
        tag.color = color;
    }

    save_current_state(&app, state)?;
    Ok(state.clone())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_tag(
    app: AppHandle,
    cache: State<'_, TodoCache>,
    id: String,
) -> Result<AppState, String> {
    let mut state_guard = state_from_cache(&cache)?;
    let state = state_guard.get_or_insert_with(|| AppState {
        schema_version: SCHEMA_VERSION,
        todos: vec![],
        tags: vec![],
    });

    state.tags.retain(|tag| tag.id != id);
    for todo in state.todos.iter_mut() {
        todo.tag_ids.retain(|tag_id| tag_id != &id);
    }

    save_current_state(&app, state)?;
    Ok(state.clone())
}

#[cfg(test)]
mod tests {
    use super::{
        load_from_disk, normalize_state, parse_content_and_tags, save_to_disk, AppState, Tag, Todo,
        SCHEMA_VERSION,
    };

    fn legacy_todo() -> Todo {
        Todo {
            id: "".to_string(),
            content: "旧任务".to_string(),
            done: false,
            due_date: None,
            priority: 99,
            tag_ids: vec!["missing".to_string()],
            reminder_enabled: false,
            completed_at: Some("2026-06-28".to_string()),
            last_notified_on: None,
        }
    }

    #[test]
    fn normalizes_missing_ids_priority_and_open_completion() {
        let state = normalize_state(AppState {
            schema_version: 1,
            todos: vec![legacy_todo()],
            tags: vec![],
        });

        assert_eq!(state.schema_version, SCHEMA_VERSION);
        assert!(state.todos[0].id.starts_with("todo-"));
        assert_eq!(state.todos[0].priority, 5);
        assert!(state.todos[0].tag_ids.is_empty());
        assert_eq!(state.todos[0].completed_at, None);
    }

    #[test]
    fn loads_legacy_todo_array() {
        let path = std::env::temp_dir().join(format!("oasis-legacy-{}.json", std::process::id()));
        std::fs::write(
            &path,
            r#"[{"id":"","content":"legacy","done":false,"due_date":null}]"#,
        )
        .expect("write legacy fixture");

        let state = load_from_disk(&path).expect("load legacy state");
        let _ = std::fs::remove_file(path);

        assert_eq!(state.schema_version, SCHEMA_VERSION);
        assert_eq!(state.todos.len(), 1);
        assert_eq!(state.todos[0].priority, 3);
        assert!(state.tags.is_empty());
    }

    #[test]
    fn saves_versioned_state() {
        let path = std::env::temp_dir().join(format!("oasis-state-{}.json", std::process::id()));
        let state = AppState {
            schema_version: SCHEMA_VERSION,
            todos: vec![],
            tags: vec![],
        };

        save_to_disk(&path, &state).expect("save state");
        let loaded = load_from_disk(&path).expect("reload state");
        let _ = std::fs::remove_file(path);

        assert_eq!(loaded.schema_version, SCHEMA_VERSION);
        assert!(loaded.todos.is_empty());
        assert!(loaded.tags.is_empty());
    }

    #[test]
    fn parses_tags_when_saving_content() {
        let mut state = AppState {
            schema_version: SCHEMA_VERSION,
            todos: vec![],
            tags: vec![Tag {
                id: "tag-existing".to_string(),
                name: "生活".to_string(),
                color: "#d97757".to_string(),
            }],
        };

        let (content, tag_ids) =
            parse_content_and_tags(&mut state, "买菜 @生活 @urgent 明天".to_string(), vec![]);

        assert_eq!(content, "买菜 明天");
        assert_eq!(state.tags.len(), 2);
        assert_eq!(tag_ids.len(), 2);
        assert!(tag_ids.contains(&"tag-existing".to_string()));
        assert!(state.tags.iter().any(|tag| tag.name == "urgent"));
    }

    #[test]
    fn preserves_existing_tags_when_no_inline_tag_is_present() {
        let mut state = AppState {
            schema_version: SCHEMA_VERSION,
            todos: vec![],
            tags: vec![Tag {
                id: "tag-existing".to_string(),
                name: "work".to_string(),
                color: "#d97757".to_string(),
            }],
        };

        let (content, tag_ids) = parse_content_and_tags(
            &mut state,
            "finish report".to_string(),
            vec!["tag-existing".to_string()],
        );

        assert_eq!(content, "finish report");
        assert_eq!(tag_ids, vec!["tag-existing".to_string()]);
        assert_eq!(state.tags.len(), 1);
    }
}
