import { createEffect, onMount } from "solid-js";
import { createStore, type SetStoreFunction, type Store } from "solid-js/store";
import { invoke } from "@tauri-apps/api/core";

export interface Todo {
  content: string;
  done: boolean;
}

export function createTauriStore<T extends object>(
  init: T,
): [Store<T>, SetStoreFunction<T>] {
  const [state, setState] = createStore<T>(init);

  onMount(async () => {
    try {
      const SavedData = await invoke<T>("load_todos");
      if (SavedData) {
        setState(SavedData);
      }
    } catch (e) {
      console.error("无法从 Rust 中加载数据：", e);
    }
  });

  createEffect(() => {
    invoke("save_todos", { data: state }).catch((err) => {
      console.error("保存至 Rust 失败：", err);
    });
  });

  return [state, setState];
}

export function removeIndex<T>(array: readonly T[], index: number): T[] {
  return [...array.slice(0, index), ...array.slice(index + 1)];
}
