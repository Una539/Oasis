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

import { Dialog } from "@ark-ui/solid/dialog";
import { SearchIcon, XIcon } from "lucide-solid";
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import {
  type CorePartitionKey,
  type FocusRouteRecommendation,
  type Partitions,
  type SearchResultGroup,
  type TodoStats,
} from "../hooks/useTodos";
import TodoInput from "./TodoInput";
import DesktopTodoItem from "./DesktopTodoItem";
import StatsPanel from "./StatsPanel";
import SearchPanel from "./SearchPanel";

const PARTITION_KEYS: CorePartitionKey[] = ["today", "upcoming", "inbox"];

const PARTITION_LABELS: Record<CorePartitionKey, string> = {
  today: "今日",
  upcoming: "以后",
  inbox: "灵感",
};

const EMPTY_MESSAGES: Record<CorePartitionKey, string> = {
  today: "今日没有待办，保持这份清爽。",
  upcoming: "以后还没有安排。",
  inbox: "灵感箱是空的。",
};

const MIN_SIDEBAR_WIDTH = 120;
const DEFAULT_SIDEBAR_WIDTH = 160;

interface DesktopAppProps {
  partitions: Partitions;
  focusRecommendation: FocusRouteRecommendation | null;
  stats: TodoStats;
  buildSearchResultGroups: (query: string) => SearchResultGroup[];
  handleAdd: (
    content: string,
    plannedDate: string | null,
    dueDate: string | null,
  ) => Promise<boolean>;
  handleDelete: (id: string) => Promise<void>;
  handleToggle: (id: string, currentView?: CorePartitionKey) => Promise<void>;
  handleUpdate: (id: string, content: string) => Promise<void>;
  handleUpdatePlannedDate: (
    id: string,
    plannedDate: string | null,
  ) => Promise<void>;
  handleUpdateDueDate: (id: string, dueDate: string | null) => Promise<void>;
  handleUpdatePriority: (id: string, priority: number) => Promise<void>;
  handleUpdateReminder: (id: string, reminderEnabled: boolean) => Promise<void>;
  clearFocusRecommendation: () => void;
}

type DesktopViewKey = CorePartitionKey | "stats";

export default function DesktopApp(props: DesktopAppProps) {
  const [currentView, setCurrentView] = createSignal<DesktopViewKey>("today");
  const [targetWidth, setTargetWidth] = createSignal(DEFAULT_SIDEBAR_WIDTH);
  const [windowWidth, setWindowWidth] = createSignal(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );

  const sidebarWidth = createMemo(() =>
    Math.min(targetWidth(), Math.max(windowWidth() / 4, MIN_SIDEBAR_WIDTH)),
  );

  let cleanupResize: (() => void) | null = null;
  let resizeHandle: HTMLDivElement | undefined;

  const handleResizeStart = (e: MouseEvent) => {
    e.preventDefault();

    const startX = e.clientX;
    const startTarget = targetWidth();

    const handleResizeMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      setTargetWidth(Math.max(startTarget + delta, MIN_SIDEBAR_WIDTH));
    };

    const handleResizeEnd = () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
      cleanupResize = null;
    };

    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);

    cleanupResize = () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
    };
  };

  const handleWindowResize = () => {
    setWindowWidth(window.innerWidth);
  };

  onMount(() => {
    resizeHandle?.addEventListener("mousedown", handleResizeStart);
    window.addEventListener("resize", handleWindowResize);
  });

  onCleanup(() => {
    cleanupResize?.();
    resizeHandle?.removeEventListener("mousedown", handleResizeStart);
    window.removeEventListener("resize", handleWindowResize);
  });

  const switchView = (view: DesktopViewKey) => {
    setCurrentView(view);
    props.clearFocusRecommendation();
  };

  const acceptFocusRecommendation = () => {
    const recommendation = props.focusRecommendation;
    if (!recommendation) return;

    setCurrentView(recommendation.target_view);
    props.clearFocusRecommendation();
  };

  const currentTodos = () => {
    const view = currentView();
    if (view === "stats") return [];
    return props.partitions[view];
  };

  const currentEmptyMessage = () => {
    const view = currentView();
    if (view === "stats") return "";
    return EMPTY_MESSAGES[view];
  };

  return (
    <main flex h-full bg-bg overflow-hidden select-none>
      <nav
        style={{ width: `${sidebarWidth()}px` }}
        bg-surface
        border-r
        border-border
        pt-4
        px-3
        flex
        flex-col
        gap-1
        flex-shrink-0
      >
        <For each={PARTITION_KEYS}>
          {(key) => (
            <button
              onClick={() => switchView(key)}
              class={currentView() === key ? "selected-item" : "unselected-item"}
            >
              <span>{PARTITION_LABELS[key]}</span>
              <span>{props.partitions[key].length}</span>
            </button>
          )}
        </For>

        <div class="sidebar-section-title">更多</div>
        <button
          onClick={() => switchView("stats")}
          class={currentView() === "stats" ? "selected-item" : "unselected-item"}
        >
          <span>统计</span>
          <span>Pulse</span>
        </button>
      </nav>

      <div
        ref={resizeHandle}
        class="resize-handle"
        w-2
        cursor-col-resize
        transition-colors
        duration-150
        flex-shrink-0
      />

      <div
        class="desktop-content-area"
        flex-1
        min-w-0
        px-5
        pt-6
        pb-5
        flex
        flex-col
        gap-3
        h-full
        box-border
      >
        <Show when={currentView() !== "stats"}>
          <TodoInput onAdd={props.handleAdd} />
        </Show>

        <Show when={currentView() !== "stats" && props.focusRecommendation}>
          {(recommendation) => (
            <div class="focus-route-banner">
              <span>{recommendation().message}</span>
              <button type="button" onClick={acceptFocusRecommendation}>
                {recommendation().action_label}
              </button>
            </div>
          )}
        </Show>

        <div flex-1 min-w-0 overflow-y-auto overflow-x-hidden pr-1>
          <Show when={currentView() === "stats"}>
            <StatsPanel stats={props.stats} />
          </Show>
          <Show when={currentView() !== "stats" && currentTodos().length === 0}>
            <div class="empty-state">{currentEmptyMessage()}</div>
          </Show>
          <Show when={currentView() !== "stats"}>
            <For each={currentTodos()}>
              {(todo) => (
                <DesktopTodoItem
                  todo={todo}
                  onToggle={(id) =>
                    props.handleToggle(id, currentView() as CorePartitionKey)
                  }
                  onDelete={props.handleDelete}
                  onUpdate={props.handleUpdate}
                  onUpdatePlannedDate={props.handleUpdatePlannedDate}
                  onUpdateDueDate={props.handleUpdateDueDate}
                  onUpdatePriority={props.handleUpdatePriority}
                  onUpdateReminder={props.handleUpdateReminder}
                />
              )}
            </For>
          </Show>
        </div>

        <Dialog.Root lazyMount unmountOnExit>
          <Dialog.Trigger
            class="desktop-search-fab"
            aria-label="打开全局搜索"
            title="搜索"
          >
            <SearchIcon size={21} />
          </Dialog.Trigger>
          <Dialog.Backdrop class="desktop-search-backdrop" />
          <Dialog.Positioner class="desktop-search-positioner">
            <Dialog.Content class="desktop-search-dialog">
              <header class="desktop-search-dialog-header">
                <Dialog.Title class="desktop-search-dialog-title">
                  搜索
                </Dialog.Title>
                <Dialog.CloseTrigger
                  class="desktop-search-close"
                  aria-label="关闭搜索"
                  title="关闭"
                >
                  <XIcon size={18} />
                </Dialog.CloseTrigger>
              </header>
              <SearchPanel
                variant="desktop"
                buildSearchResultGroups={props.buildSearchResultGroups}
                onToggle={props.handleToggle}
                onDelete={props.handleDelete}
                onUpdate={props.handleUpdate}
                onUpdatePlannedDate={props.handleUpdatePlannedDate}
                onUpdateDueDate={props.handleUpdateDueDate}
                onUpdatePriority={props.handleUpdatePriority}
                onUpdateReminder={props.handleUpdateReminder}
              />
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>
      </div>
    </main>
  );
}
