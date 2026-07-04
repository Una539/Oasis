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

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod input_parser;
mod store;

use crate::store::{get_storage_path, save_to_disk, TodoCache};
use std::{env, fs, path::Path, process::Command, sync::Mutex};
use tauri::{Manager, WindowEvent};
use tauri_specta::{collect_commands, Builder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    configure_linux_webkit_environment();

    let builder = Builder::new().commands(collect_commands![
        store::load_app_state,
        store::add_todo,
        store::check_focus_route,
        store::delete_todo,
        store::toggle_todo,
        store::update_todo_content,
        store::update_todo_planned_date,
        store::update_todo_due_date,
        store::update_todo_priority,
        store::update_todo_tags,
        store::update_todo_reminder,
        store::mark_todo_notified,
        store::analyze_tag_input,
        store::apply_tag_suggestion,
        store::create_tag,
        store::update_tag,
        store::delete_tag,
    ]);

    #[cfg(all(debug_assertions, not(target_os = "android")))]
    {
        use specta_typescript::Typescript;
        builder
            .export(Typescript::default(), "../../src/bindings.ts")
            .expect("Failed to export TypeScript bindings");
    }

    tauri::Builder::default()
        .manage(TodoCache {
            state: Mutex::new(None),
        })
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(builder.invoke_handler())
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                let handle = window.app_handle();
                let cache = handle.state::<TodoCache>();

                let Ok(state) = cache.state.lock() else {
                    eprintln!("保存时锁获取失败");
                    return;
                };

                let Some(state) = &*state else {
                    // 缓存为空，无需保存
                    return;
                };

                let Ok(path) = get_storage_path(handle) else {
                    eprintln!("获取路径失败");
                    return;
                };

                if let Err(e) = save_to_disk(&path, state) {
                    eprintln!("保存失败: {e}");
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn configure_linux_webkit_environment() {
    if !cfg!(target_os = "linux") {
        return;
    }

    let explicit_dmabuf_fallback = matches!(
        env::var("OASIS_DISABLE_DMABUF_RENDERER").as_deref(),
        Ok("1")
    );
    let keep_dmabuf_renderer =
        matches!(env::var("OASIS_ENABLE_DMABUF_RENDERER").as_deref(), Ok("1"));

    if env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_ok() || keep_dmabuf_renderer {
        return;
    }

    if explicit_dmabuf_fallback || has_nvidia_gpu() || has_affected_wayland_client() {
        env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        println!("Linux fallback enabled: set WEBKIT_DISABLE_DMABUF_RENDERER=1");
    }
}

fn has_affected_wayland_client() -> bool {
    if !matches!(env::var("XDG_SESSION_TYPE").as_deref(), Ok("wayland")) {
        return false;
    }

    let version = Command::new("pkg-config")
        .args(["--modversion", "wayland-client"])
        .output()
        .ok()
        .and_then(|output| String::from_utf8(output.stdout).ok());

    version
        .as_deref()
        .and_then(parse_wayland_version)
        .is_some_and(|version| version <= (1, 23, 0))
}

fn parse_wayland_version(version: &str) -> Option<(u32, u32, u32)> {
    let mut parts = version.trim().split('.');
    let major = parts.next()?.parse().ok()?;
    let minor = parts.next().unwrap_or("0").parse().ok()?;
    let patch = parts.next().unwrap_or("0").parse().ok()?;
    Some((major, minor, patch))
}

fn has_nvidia_gpu() -> bool {
    if Path::new("/proc/driver/nvidia/version").exists()
        || Path::new("/sys/module/nvidia").exists()
        || Path::new("/sys/module/nvidia_drm").exists()
    {
        return true;
    }

    let Ok(entries) = fs::read_dir("/sys/class/drm") else {
        return false;
    };

    entries.flatten().any(|entry| {
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if !name.starts_with("card") || name.contains('-') {
            return false;
        }

        fs::read_to_string(entry.path().join("device/vendor"))
            .is_ok_and(|vendor| vendor.trim().eq_ignore_ascii_case("0x10de"))
    })
}

#[cfg(test)]
mod tests {
    use specta_typescript::Typescript;
    use tauri_specta::{collect_commands, Builder};

    #[test]
    fn export_typescript_bindings() {
        let builder = Builder::new().commands(collect_commands![
            super::store::load_app_state,
            super::store::add_todo,
            super::store::check_focus_route,
            super::store::delete_todo,
            super::store::toggle_todo,
            super::store::update_todo_content,
            super::store::update_todo_planned_date,
            super::store::update_todo_due_date,
            super::store::update_todo_priority,
            super::store::update_todo_tags,
            super::store::update_todo_reminder,
            super::store::mark_todo_notified,
            super::store::analyze_tag_input,
            super::store::apply_tag_suggestion,
            super::store::create_tag,
            super::store::update_tag,
            super::store::delete_tag,
        ]);
        builder
            .export(Typescript::default(), "../src/bindings.ts")
            .expect("Failed to export TypeScript bindings");
    }
}
