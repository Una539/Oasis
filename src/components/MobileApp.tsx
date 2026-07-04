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

import { Drawer, type DrawerOpenChangeDetails } from "@ark-ui/solid/drawer";
import { For, Index, Show, createMemo, createSignal } from "solid-js";
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
  createListCollection as createSelectCollection,
  type SelectValueChangeDetails,
} from "@ark-ui/solid/select";

import { Portal } from "solid-js/web";
import {
  BarChart3Icon,
  CheckIcon,
  ChevronsUpDownIcon,
  TagsIcon,
  Trash2Icon,
  XIcon,
} from "lucide-solid";

interface Item {
  label: string;
  value: CorePartitionKey;
}

interface TagListItem {
  label: string;
  value: string;
  tagId: string;
  color: string;
  count: number;
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

const PARTITION_COLLECTION = createSelectCollection<Item>({
  items: [
    { label: "今天", value: "today" },
    { label: "未来", value: "upcoming" },
    { label: "任意时间", value: "inbox" },
    { label: "过期", value: "outdated" },
    { label: "已完成", value: "archived" },
  ],
});

export default function MobileApp(props: MobileAppProps) {
  const [currentView, setCurrentView] = createSignal<CorePartitionKey>("today");
  const [selectedTagIds, setSelectedTagIds] = createSignal<string[]>([]);
  const [statsOpen, setStatsOpen] = createSignal(false);

  const tagCollection = createMemo(() =>
    createSelectCollection<TagListItem>({
      items: props.tags.map((tag) => {
        return {
          label: tag.name,
          value: tag.id,
          tagId: tag.id,
          color: tag.color,
          count: props
            .getTodosForView(currentView())
            .filter((todo) => todo.tag_ids.includes(tag.id)).length,
        };
      }),
    }),
  );

  const handleValueChange = (details: SelectValueChangeDetails<Item>) => {
    setCurrentView(details.value[0] as CorePartitionKey);
    setSelectedTagIds([]);
  };

  const handleTagValueChange = (details: SelectValueChangeDetails<TagListItem>) => {
    setSelectedTagIds(details.value);
  };

  const handleStatsOpenChange = (details: DrawerOpenChangeDetails) => {
    setStatsOpen(details.open);
  };

  // ---- 计算属性 ----
  // 根据当前分区获取对应的待办列表
  const currentTodos = () => {
    const todos = props.getTodosForView(currentView());
    const tagIds = selectedTagIds();
    if (tagIds.length === 0) return todos;
    return todos.filter((todo) =>
      tagIds.every((tagId) => todo.tag_ids.includes(tagId)),
    );
  };

  const currentEmptyMessage = () => {
    const view = currentView();
    if (selectedTagIds().length > 0) return "这些标签下还没有待办。";
    return EMPTY_MESSAGES[view as CorePartitionKey];
  };

  const deleteTag = async (tagId: string) => {
    await props.handleDeleteTag(tagId);
    setSelectedTagIds((current) => current.filter((id) => id !== tagId));
  };

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
        <Select.Root
          collection={tagCollection()}
          value={selectedTagIds()}
          onValueChange={handleTagValueChange}
          multiple
          closeOnSelect={false}
        >
          <Select.Control>
            <Select.Trigger
              class="mobile-header-icon-button mobile-tag-select-trigger"
              aria-label="打开标签筛选"
              title="标签"
            >
              <TagsIcon size={19} />
              <Show when={selectedTagIds().length > 0}>
                <span class="mobile-tag-select-badge">{selectedTagIds().length}</span>
              </Show>
            </Select.Trigger>
          </Select.Control>
          <Portal>
            <Select.Positioner class="mobile-tag-select-positioner">
              <Select.Content class="select-content mobile-tag-select-content p-1">
                <Show
                  when={props.tags.length > 0}
                  fallback={<div class="mobile-tag-empty">还没有标签。</div>}
                >
                  <Select.ItemGroup>
                    <Index each={tagCollection().items}>
                      {(item) => (
                        <Select.Item
                          class="select-item mobile-tag-select-item px-2 py-2 text-sm rounded cursor-pointer flex items-center gap-2 transition-colors duration-150"
                          item={item()}
                          style={{ "--tag-color": item().color }}
                        >
                          <Select.ItemText class="mobile-tag-select-text">
                            <span class="sidebar-tag-label">{item().label}</span>
                            <span class="mobile-tag-count">{item().count}</span>
                          </Select.ItemText>
                          <Select.ItemIndicator class="select-item-indicator mobile-tag-select-check">
                            <CheckIcon size={15} />
                          </Select.ItemIndicator>
                          <button
                            type="button"
                            class="mobile-tag-delete"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation();
                              void deleteTag(item().tagId);
                            }}
                            aria-label={`删除标签 ${item().label}`}
                            title="删除标签"
                          >
                            <Trash2Icon size={15} />
                          </button>
                        </Select.Item>
                      )}
                    </Index>
                  </Select.ItemGroup>
                </Show>
              </Select.Content>
            </Select.Positioner>
          </Portal>
          <Select.HiddenSelect />
        </Select.Root>
        <div class="mobile-select-wrapper">
          <Select.Root
            collection={PARTITION_COLLECTION}
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
                    <Index each={PARTITION_COLLECTION.items}>
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
                canReschedule={selectedTagIds().length === 0 && currentView() === "outdated"}
              />
            )}
          </For>
        </div>
      </div>

      <Drawer.Root
        open={statsOpen()}
        onOpenChange={handleStatsOpenChange}
        swipeDirection="end"
      >
        <Drawer.Backdrop class="mobile-stats-scrim" />
        <Drawer.Positioner class="mobile-stats-drawer-positioner">
          <Drawer.Content class="mobile-stats-drawer">
            <header class="mobile-stats-drawer-header">
              <Drawer.Title>统计</Drawer.Title>
              <Drawer.CloseTrigger class="mobile-stats-close" title="关闭">
                <XIcon size={18} />
              </Drawer.CloseTrigger>
            </header>
            <StatsPanel stats={props.stats} />
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
    </main>
  );
}
