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
import {
  Select,
  createListCollection as createSelectCollection,
  type SelectValueChangeDetails,
} from "@ark-ui/solid/select";
import { For, Index, Show, createSignal, onCleanup, onMount } from "solid-js";
import { Portal } from "solid-js/web";
import { BarChart3Icon, ChevronsUpDownIcon, SearchIcon, XIcon } from "lucide-solid";
import {
  type CorePartitionKey,
  type FocusRouteRecommendation,
  type Partitions,
  type SearchResultGroup,
  type TodoStats,
} from "../hooks/useTodos";
import TodoInput from "./TodoInput";
import MobileTodoItem from "./MobileTodoItem";
import StatsPanel from "./StatsPanel";
import SearchPanel from "./SearchPanel";

interface Item {
  label: string;
  value: CorePartitionKey;
}

interface MobileAppProps {
  partitions: Partitions;
  focusRecommendation: FocusRouteRecommendation | null;
  stats: TodoStats;
  searchTodos: (query: string) => Promise<SearchResultGroup[]>;
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

const EMPTY_MESSAGES: Record<CorePartitionKey, string> = {
  today: "今日没有待办，保持这份清爽。",
  upcoming: "以后还没有安排。",
  inbox: "灵感箱是空的。",
};

const PARTITION_COLLECTION = createSelectCollection<Item>({
  items: [
    { label: "今日", value: "today" },
    { label: "以后", value: "upcoming" },
    { label: "灵感", value: "inbox" },
  ],
});

export default function MobileApp(props: MobileAppProps) {
  const [currentView, setCurrentView] = createSignal<CorePartitionKey>("today");
  const [statsOpen, setStatsOpen] = createSignal(false);
  const [searchOpen, setSearchOpen] = createSignal(false);

  onMount(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboardInset = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      document.documentElement.style.setProperty("--keyboard-inset", `${inset}px`);
    };

    updateKeyboardInset();
    viewport.addEventListener("resize", updateKeyboardInset);
    viewport.addEventListener("scroll", updateKeyboardInset);

    onCleanup(() => {
      viewport.removeEventListener("resize", updateKeyboardInset);
      viewport.removeEventListener("scroll", updateKeyboardInset);
      document.documentElement.style.removeProperty("--keyboard-inset");
    });
  });

  const handleValueChange = (details: SelectValueChangeDetails<Item>) => {
    const nextView = details.value[0] as CorePartitionKey | undefined;
    if (!nextView) return;

    setCurrentView(nextView);
    props.clearFocusRecommendation();
  };

  const handleStatsOpenChange = (details: DrawerOpenChangeDetails) => {
    setStatsOpen(details.open);
  };

  const handleSearchOpenChange = (details: DrawerOpenChangeDetails) => {
    setSearchOpen(details.open);
  };

  const acceptFocusRecommendation = () => {
    const recommendation = props.focusRecommendation;
    if (!recommendation) return;

    setCurrentView(recommendation.target_view);
    props.clearFocusRecommendation();
  };

  const currentTodos = () => props.partitions[currentView()];

  return (
    <main flex flex-col h-full bg-bg>
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
              <Select.Positioner class="w-[62%]">
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
        pb="[calc(96px+env(safe-area-inset-bottom,0px))]"
        gap-3
        overflow-hidden
      >
        <Show when={props.focusRecommendation}>
          {(recommendation) => (
            <div class="focus-route-banner mobile">
              <span>{recommendation().message}</span>
              <button type="button" onClick={acceptFocusRecommendation}>
                {recommendation().action_label}
              </button>
            </div>
          )}
        </Show>

        <div flex-1 overflow-y-auto overflow-x-hidden pr-1 flex flex-col gap-2>
          <Show when={currentTodos().length === 0}>
            <div class="empty-state mobile">{EMPTY_MESSAGES[currentView()]}</div>
          </Show>
          <For each={currentTodos()}>
            {(todo) => (
              <MobileTodoItem
                todo={todo}
                onToggle={(id) => props.handleToggle(id, currentView())}
                onDelete={props.handleDelete}
                onUpdate={props.handleUpdate}
                onUpdatePlannedDate={props.handleUpdatePlannedDate}
                onUpdateDueDate={props.handleUpdateDueDate}
                onUpdatePriority={props.handleUpdatePriority}
                onUpdateReminder={props.handleUpdateReminder}
              />
            )}
          </For>
        </div>
      </div>

      <div class="mobile-floating-actions">
        <button
          type="button"
          class="mobile-floating-search-button"
          onClick={() => setSearchOpen(true)}
          aria-label="打开搜索"
          title="搜索"
        >
          <SearchIcon size={21} />
        </button>
        <TodoInput onAdd={props.handleAdd} />
      </div>

      <Drawer.Root
        open={statsOpen()}
        onOpenChange={handleStatsOpenChange}
        swipeDirection="end"
        lazyMount
        unmountOnExit
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

      <Drawer.Root
        open={searchOpen()}
        onOpenChange={handleSearchOpenChange}
        lazyMount
        unmountOnExit
      >
        <Drawer.Backdrop class="mobile-stats-scrim" />
        <Drawer.Positioner class="mobile-search-drawer-positioner">
          <Drawer.Content class="mobile-search-drawer search-drawer">
            <header class="mobile-stats-drawer-header">
              <Drawer.Title>搜索</Drawer.Title>
              <Drawer.CloseTrigger class="mobile-stats-close" title="关闭">
                <XIcon size={18} />
              </Drawer.CloseTrigger>
            </header>
            <SearchPanel
              variant="mobile"
              searchTodos={props.searchTodos}
              onToggle={props.handleToggle}
              onDelete={props.handleDelete}
              onUpdate={props.handleUpdate}
              onUpdatePlannedDate={props.handleUpdatePlannedDate}
              onUpdateDueDate={props.handleUpdateDueDate}
              onUpdatePriority={props.handleUpdatePriority}
              onUpdateReminder={props.handleUpdateReminder}
            />
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
    </main>
  );
}
