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

import { onMount } from "solid-js";
import { createStore, type SetStoreFunction, type Store } from "solid-js/store";
import { commands, type AppState } from "./bindings";

export type { AppState };

// 这个函数使用 Tauri 储存数据
export function createTauriStore<T extends object>(
  init: T,
): [Store<T>, SetStoreFunction<T>] {
  const [state, setState] = createStore<T>(init);
  // 在第一次打开应用时从 Rust 获取数据
  onMount(async () => {
    try {
      const result = await commands.loadAppState();
      if (result.status === "ok") {
        // 用从 Rust 获取的数据替换默认的空白数据
        setState(result.data as T);
      } else {
        console.error("无法从 Rust 中加载数据：", result.error);
      }
    } catch (e) {
      console.error("无法从 Rust 中加载数据：", e);
    }
  });

  return [state, setState];
}
