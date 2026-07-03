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

import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import { type AppState as GeneratedAppState } from "../bindings";
import {
  type CorePartitionKey,
  type Partitions,
  type Tag,
  type TodoStats,
  type ViewKey,
} from "../hooks/useTodos";
import TodoInput from "./TodoInput";
import MobileTodoItem from "./MobileTodoItem";
import StatsPanel from "./StatsPanel";
import {
  Select,
  createListCollection,
  type SelectValueChangeDetails,
} from "@ark-ui/solid/select";

import { Index, Portal } from "solid-js/web";
import {
  BarChart3Icon,
  ChevronsUpDownIcon,
  TagsIcon,
  Trash2Icon,
  XIcon,
} from "lucide-solid";

interface Item {
  label: string;
  value: ViewKey;
}

interface MobileAppProps {
  partitions: Partitions;
  tags: Tag[];
  stats: TodoStats;
  getTodosForView: (view: ViewKey) => import("../hooks/useTodos").Todo[];
  handleAdd: (
    content: string,
    dueDate: string | null,
    tagIds: string[],
  ) => Promise<boolean>;
  handleDelete: (id: string) => Promise<void>;
  handleToggle: (id: string) => Promise<void>;
  handleUpdate: (id: string, content: string) => Promise<void>;
  handleUpdateDueDate: (id: string, dueDate: string | null) => Promise<void>;
  handleUpdatePriority: (id: string, priority: number) => Promise<void>;
  handleUpdateTags: (id: string, tagIds: string[]) => Promise<void>;
  handleUpdateReminder: (id: string, reminderEnabled: boolean) => Promise<void>;
  handleApplyAppState: (state: GeneratedAppState) => void;
  handleDeleteTag: (id: string) => Promise<void>;
}

const EMPTY_MESSAGES: Record<CorePartitionKey, string> = {
  today: "今天没有待办，保持这份清爽。",
  upcoming: "未来还没有安排。",
  inbox: "没有未安排日期的待办。",
  outdated: "没有过期待办。",
  archived: "还没有完成记录。",
};

export default function MobileApp(props: MobileAppProps) {
  const [currentView, setCurrentView] = createSignal<ViewKey>("today");
  const [statsOpen, setStatsOpen] = createSignal(false);
  const [tagOpen, setTagOpen] = createSignal(false);

  const collection = () =>
    createListCollection<Item>({
      items: [
        { label: "今天", value: "today" },
        { label: "未来", value: "upcoming" },
        { label: "任意时间", value: "inbox" },
        { label: "过期", value: "outdated" },
        { label: "已完成", value: "archived" },
      ],
    });

  const handleValueChange = (details: SelectValueChangeDetails<Item>) => {
    setCurrentView(details.value[0] as ViewKey);
  };

  // ---- 计算属性 ----
  // 根据当前分区获取对应的待办列表
  const currentTodos = () => {
    return props.getTodosForView(currentView());
  };

  const currentEmptyMessage = () => {
    const view = currentView();
    if (view.startsWith("tag:")) return "这个标签下还没有待办。";
    if (view === "stats") return "";
    return EMPTY_MESSAGES[view as CorePartitionKey];
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      setStatsOpen(false);
      setTagOpen(false);
    }
  };

  const selectTag = (tagId: string) => {
    setCurrentView(`tag:${tagId}`);
    setTagOpen(false);
  };

  const deleteTag = async (tagId: string) => {
    await props.handleDeleteTag(tagId);
    if (currentView() === `tag:${tagId}`) {
      setCurrentView("today");
    }
  };

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
  });

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <main flex flex-col h-full bg-bg>
      {/* Mobile title bar at top */}
      <header
        flex-shrink-0
        flex
        items-center
        justify-center
        px-5
        pt="[calc(16px+env(safe-area-inset-top,0px))]"
        pb-3
        bg-surface
        border-b
        border-border
      >
        <button
          type="button"
          class="mobile-header-icon-button"
          onClick={() => setTagOpen(true)}
          aria-label="打开标签筛选"
          title="标签"
        >
          <TagsIcon size={19} />
        </button>
        <div class="mobile-select-wrapper">
          <Select.Root
            collection={collection()}
            value={[currentView()]}
            onValueChange={handleValueChange}
          >
            <Select.Control class="mobile-select-control">
              <Select.Trigger class="select-trigger border border-border bg-surface color-text px-3 py-2 rounded-lg text-sm w-full text-left transition-all duration-150 outline-none">
                <Select.ValueText placeholder="选择分区" />
              </Select.Trigger>
              <div class="mobile-select-indicators">
                <Select.Indicator class="select-indicator">
                  <ChevronsUpDownIcon />
                </Select.Indicator>
              </div>
            </Select.Control>
            <Portal>
              <Select.Positioner class="w-[55%]">
                <Select.Content class="select-content p-1">
                  <Select.ItemGroup>
                    <Index each={collection().items}>
                      {(item) => (
                        <Select.Item
                          class="select-item px-2 py-2 text-sm rounded cursor-pointer flex items-center justify-between gap-2 transition-colors duration-150"
                          item={item()}
                        >
                          <Select.ItemText class="select-item-text color-text flex-1 truncate">
                            {item().label}
                          </Select.ItemText>
                        </Select.Item>
                      )}
                    </Index>
                  </Select.ItemGroup>
                </Select.Content>
              </Select.Positioner>
            </Portal>
            <Select.HiddenSelect />
          </Select.Root>
        </div>
        <button
          type="button"
          class="mobile-header-icon-button"
          onClick={() => setStatsOpen(true)}
          aria-label="打开统计"
          title="统计"
        >
          <BarChart3Icon size={19} />
        </button>
      </header>

      <div
        flex-1
        flex
        flex-col
        px-4
        pt-4
        pb="[calc(20px+env(safe-area-inset-bottom,0px))]"
        gap-3
        overflow-hidden
      >
        <TodoInput
          tags={props.tags}
          onAdd={props.handleAdd}
          onAppStateChange={props.handleApplyAppState}
        />

        <div flex-1 overflow-y-auto overflow-x-hidden pr-1 flex flex-col gap-2>
          <Show when={currentTodos().length === 0}>
            <div class="empty-state mobile">{currentEmptyMessage()}</div>
          </Show>
          <For each={currentTodos()}>
            {(todo) => (
              <MobileTodoItem
                todo={todo}
                tags={props.tags}
                onToggle={props.handleToggle}
                onDelete={props.handleDelete}
                onUpdate={props.handleUpdate}
                onUpdateDueDate={props.handleUpdateDueDate}
                onUpdatePriority={props.handleUpdatePriority}
                onUpdateTags={props.handleUpdateTags}
                onUpdateReminder={props.handleUpdateReminder}
                onAppStateChange={props.handleApplyAppState}
                canReschedule={currentView() === "outdated"}
              />
            )}
          </For>
        </div>
      </div>

      <Show when={statsOpen()}>
        <div
          class="mobile-stats-scrim"
          onClick={() => setStatsOpen(false)}
          role="presentation"
        >
          <aside
            class="mobile-stats-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="统计"
            onClick={(event) => event.stopPropagation()}
          >
            <header class="mobile-stats-drawer-header">
              <span>统计</span>
              <button
                type="button"
                class="mobile-stats-close"
                onClick={() => setStatsOpen(false)}
                aria-label="关闭统计"
                title="关闭"
              >
                <XIcon size={18} />
              </button>
            </header>
            <StatsPanel stats={props.stats} />
          </aside>
        </div>
      </Show>

      <Show when={tagOpen()}>
        <div
          class="mobile-stats-scrim"
          onClick={() => setTagOpen(false)}
          role="presentation"
        >
          <aside
            class="mobile-tag-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="标签筛选"
            onClick={(event) => event.stopPropagation()}
          >
            <header class="mobile-stats-drawer-header">
              <span>标签</span>
              <button
                type="button"
                class="mobile-stats-close"
                onClick={() => setTagOpen(false)}
                aria-label="关闭标签筛选"
                title="关闭"
              >
                <XIcon size={18} />
              </button>
            </header>
            <Show
              when={props.tags.length > 0}
              fallback={<div class="mobile-tag-empty">还没有标签。</div>}
            >
              <div class="mobile-tag-list">
                <For each={props.tags}>
                  {(tag) => {
                    const view = `tag:${tag.id}` as const;
                    const count = () =>
                      props.getTodosForView(view).filter((todo) => !todo.done).length;
                    return (
                      <div
                        class={
                          currentView() === view
                            ? "mobile-tag-list-item selected"
                            : "mobile-tag-list-item"
                        }
                      >
                        <button
                          type="button"
                          class="mobile-tag-filter"
                          onClick={() => selectTag(tag.id)}
                        >
                          <span
                            class="sidebar-tag-label"
                            style={{ "--tag-color": tag.color }}
                          >
                            {tag.name}
                          </span>
                          <span>{count()}</span>
                        </button>
                        <button
                          type="button"
                          class="mobile-tag-delete"
                          onClick={() => void deleteTag(tag.id)}
                          aria-label={`删除标签 ${tag.name}`}
                          title="删除标签"
                        >
                          <Trash2Icon size={15} />
                        </button>
                      </div>
                    );
                  }}
                </For>
              </div>
            </Show>
          </aside>
        </div>
      </Show>
    </main>
  );
}
