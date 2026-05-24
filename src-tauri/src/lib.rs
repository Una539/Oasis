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
use tauri_specta::{collect_commands, Builder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if cfg!(target_os = "linux") && env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
        env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        println!("Linux detected: set WEBKIT_DISABLE_DMABUF_RENDERER=1");
    }

    let builder = Builder::new().commands(collect_commands![
        store::load_todos,
        store::add_todo,
        store::delete_todo,
        store::toggle_todo,
        store::update_todo_content,
    ]);

    #[cfg(all(debug_assertions, not(target_os = "android")))]
    {
        use specta_typescript::Typescript;
        builder
            .export(Typescript::default(), "../../src/bindings.ts")
            .expect("Failed to export TypeScript bindings");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(builder.invoke_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use specta_typescript::Typescript;
    use tauri_specta::{collect_commands, Builder};

    #[test]
    fn export_typescript_bindings() {
        let builder = Builder::new().commands(collect_commands![
            super::store::add_todo,
            super::store::delete_todo,
            super::store::toggle_todo,
            super::store::update_todo_content,
            super::store::load_todos,
        ]);
        builder
            .export(Typescript::default(), "../src/bindings.ts")
            .expect("Failed to export TypeScript bindings");
    }
}
