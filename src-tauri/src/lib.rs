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
