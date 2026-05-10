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

import { createEffect, onMount } from "solid-js";
import { createStore, type SetStoreFunction, type Store } from "solid-js/store";
import { invoke } from "@tauri-apps/api/core";

// 这里定义了数据模型
export interface Todo {
  content: string;
  done: boolean;
}

// 这个函数使用 Tauri 储存数据
export function createTauriStore<T extends object>(
  init: T,
): [Store<T>, SetStoreFunction<T>] {
  const [state, setState] = createStore<T>(init);
  let isLoading = true;

  // 在第一次打开应用时从 Rust 获取数据
  onMount(async () => {
    try {
      const savedData = await invoke<T>("load_todos");
      if (savedData) {
        // 用从 Rust 获取的数据替换默认的空白数据
        setState(savedData);
      }
    } catch (e) {
      console.error("无法从 Rust 中加载数据：", e);
    } finally {
      isLoading = false;
    }
  });

  // 使用副作用，使每次更新 Todo 都会触发save_todos
  createEffect(() => {
    if (isLoading) return;
    invoke("save_todos", { data: state }).catch((err) => {
      console.error("保存至 Rust 失败：", err);
    });
  });

  return [state, setState];
}

// 删除某个 Todo 列表，返回新的 Todo 列表
export function removeIndex<T>(array: readonly T[], index: number): T[] {
  // 在这里是拼接操作，去除索引前和后的数据并拼接
  return [...array.slice(0, index), ...array.slice(index + 1)];
}
