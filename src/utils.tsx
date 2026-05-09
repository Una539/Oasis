import { createEffect, onMount } from "solid-js";
import { createStore, type SetStoreFunction, type Store } from "solid-js/store";
import { invoke } from "@tauri-apps/api/core";

export function createTauriStore<T extends object>(
  init: T,
): [Store<T>, SetStoreFunction<T>] {
  const [state, setState] = createStore<T>(init);

  onMount(async () => {
    try {
      const SavedData = await invoke<string>("load_todos");
      if (SavedData) {
        const prased = JSON.parse(SavedData);
        setState(prased);
      }
    } catch (e) {
      console.error("无法从 Rust 中加载数据：", e);
    }
  });

  createEffect(() => {
    const data = JSON.stringify(state);

    invoke("save_todos", { data }).catch((err) => {
      console.error("保存至 Rust 失败：", err);
    });
  });

  return [state, setState];
}

export function removeIndex<T>(array: readonly T[], index: number): T[] {
  return [...array.slice(0, index), ...array.slice(index + 1)];
}
