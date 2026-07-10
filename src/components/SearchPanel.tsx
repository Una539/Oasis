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

import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { SearchIcon } from "lucide-solid";
import {
  type SearchResultGroup,
  type Todo,
} from "../hooks/useTodos";
import DesktopTodoItem from "./DesktopTodoItem";
import MobileTodoItem from "./MobileTodoItem";

interface SearchPanelProps {
  variant: "desktop" | "mobile";
  searchTodos: (query: string) => Promise<SearchResultGroup[]>;
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, content: string) => Promise<void>;
  onUpdatePlannedDate: (id: string, plannedDate: string | null) => Promise<void>;
  onUpdateDueDate: (id: string, dueDate: string | null) => Promise<void>;
  onUpdatePriority: (id: string, priority: number) => Promise<void>;
  onUpdateReminder: (id: string, reminderEnabled: boolean) => Promise<void>;
}

export default function SearchPanel(props: SearchPanelProps) {
  const [query, setQuery] = createSignal("");
  const [resultGroups, setResultGroups] = createSignal<SearchResultGroup[]>([]);
  const normalizedQuery = createMemo(() => query().trim());
  const resultCount = createMemo(() =>
    resultGroups().reduce((count, group) => count + group.todos.length, 0),
  );
  let searchRequest = 0;

  const refreshResults = async () => {
    const currentQuery = normalizedQuery();
    const request = ++searchRequest;
    if (!currentQuery) {
      setResultGroups([]);
      return;
    }

    const groups = await props.searchTodos(currentQuery);
    if (request === searchRequest) {
      setResultGroups(groups);
    }
  };

  createEffect(() => {
    void refreshResults();
  });

  const refreshAfter = async (action: () => Promise<void>) => {
    await action();
    await refreshResults();
  };

  const renderTodo = (todo: Todo) => (
    <Show
      when={props.variant === "mobile"}
      fallback={
        <DesktopTodoItem
          todo={todo}
          onToggle={(id) => refreshAfter(() => props.onToggle(id))}
          onDelete={(id) => refreshAfter(() => props.onDelete(id))}
          onUpdate={(id, content) => refreshAfter(() => props.onUpdate(id, content))}
          onUpdatePlannedDate={(id, plannedDate) =>
            refreshAfter(() => props.onUpdatePlannedDate(id, plannedDate))
          }
          onUpdateDueDate={(id, dueDate) =>
            refreshAfter(() => props.onUpdateDueDate(id, dueDate))
          }
          onUpdatePriority={(id, priority) =>
            refreshAfter(() => props.onUpdatePriority(id, priority))
          }
          onUpdateReminder={(id, reminderEnabled) =>
            refreshAfter(() => props.onUpdateReminder(id, reminderEnabled))
          }
        />
      }
    >
      <MobileTodoItem
        todo={todo}
        onToggle={(id) => refreshAfter(() => props.onToggle(id))}
        onDelete={(id) => refreshAfter(() => props.onDelete(id))}
        onUpdate={(id, content) => refreshAfter(() => props.onUpdate(id, content))}
        onUpdatePlannedDate={(id, plannedDate) =>
          refreshAfter(() => props.onUpdatePlannedDate(id, plannedDate))
        }
        onUpdateDueDate={(id, dueDate) =>
          refreshAfter(() => props.onUpdateDueDate(id, dueDate))
        }
        onUpdatePriority={(id, priority) =>
          refreshAfter(() => props.onUpdatePriority(id, priority))
        }
        onUpdateReminder={(id, reminderEnabled) =>
          refreshAfter(() => props.onUpdateReminder(id, reminderEnabled))
        }
      />
    </Show>
  );

  return (
    <section class={`search-panel ${props.variant}`}>
      <header class="search-panel-header">
        <div>
          <p class="search-panel-kicker">全局搜索</p>
          <h1>找回任何待办</h1>
        </div>
        <Show when={normalizedQuery()}>
          <span class="search-result-count">{resultCount()} 个结果</span>
        </Show>
      </header>

      <label class="search-input-shell">
        <SearchIcon size={18} />
        <input
          value={query()}
          onInput={(event) => setQuery(event.currentTarget.value)}
          placeholder="搜索内容、日期、p1 或 !3"
          autocomplete="off"
          spellcheck={false}
        />
      </label>

      <div class="search-results">
        <Show when={normalizedQuery()} fallback={<SearchEmptyGuide />}>
          <Show
            when={resultGroups().length > 0}
            fallback={<div class="empty-state search">没有找到匹配的待办。</div>}
          >
            <For each={resultGroups()}>
              {(group) => (
                <section class="search-result-group">
                  <div class="search-result-group-title">
                    <span>{group.label}</span>
                    <small>{group.todos.length}</small>
                  </div>
                  <For each={group.todos}>{renderTodo}</For>
                </section>
              )}
            </For>
          </Show>
        </Show>
      </div>
    </section>
  );
}

function SearchEmptyGuide() {
  return (
    <div class="search-empty-guide">
      <SearchIcon size={22} />
      <p>输入关键词，搜索今日、以后、灵感和已完成任务。</p>
      <small>可以用日期、任务内容、p1 或 !3 这样的优先级标记。</small>
    </div>
  );
}
