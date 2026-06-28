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

import { For, Show, createSignal } from "solid-js";
import { type PartitionKey, type Partitions } from "../hooks/useTodos";
import TodoInput from "./TodoInput";
import MobileTodoItem from "./MobileTodoItem";
import {
  Select,
  createListCollection,
  type SelectValueChangeDetails,
} from "@ark-ui/solid/select";

import { Index, Portal } from "solid-js/web";
import { ChevronsUpDownIcon } from "lucide-solid";

interface Item {
  label: string;
  value: PartitionKey;
}

interface MobileAppProps {
  partitions: Partitions;
  handleAdd: (content: string, dueDate: string | null) => Promise<boolean>;
  handleDelete: (id: string) => Promise<void>;
  handleToggle: (id: string) => Promise<void>;
  handleUpdate: (id: string, content: string) => Promise<void>;
  handleUpdateDueDate: (id: string, dueDate: string | null) => Promise<void>;
}

const EMPTY_MESSAGES: Record<PartitionKey, string> = {
  today: "今天没有待办，保持这份清爽。",
  upcoming: "未来还没有安排。",
  inbox: "没有未安排日期的待办。",
  outdated: "没有过期待办。",
  archived: "还没有完成记录。",
};

export default function MobileApp(props: MobileAppProps) {
  const [currentPartition, setCurrentPartition] =
    createSignal<PartitionKey>("today");

  const collection = createListCollection<Item>({
    items: [
      { label: "今天", value: "today" },
      { label: "未来", value: "upcoming" },
      { label: "任意时间", value: "inbox" },
      { label: "过期", value: "outdated" },
      { label: "已完成", value: "archived" },
    ],
  });

  const handleValueChange = (details: SelectValueChangeDetails<Item>) => {
    setCurrentPartition(details.value[0] as PartitionKey);
  };

  // ---- 计算属性 ----
  // 根据当前分区获取对应的待办列表
  const currentTodos = () => {
    return props.partitions[currentPartition()];
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
        <div class="mobile-select-wrapper">
          <Select.Root
            collection={collection}
            value={[currentPartition()]}
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
                    <Index each={collection.items}>
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
        <TodoInput onAdd={props.handleAdd} />

        <div flex-1 overflow-y-auto overflow-x-hidden pr-1 flex flex-col gap-2>
          <Show when={currentTodos().length === 0}>
            <div class="empty-state mobile">{EMPTY_MESSAGES[currentPartition()]}</div>
          </Show>
          <For each={currentTodos()}>
            {(todo) => (
              <MobileTodoItem
                todo={todo}
                onToggle={props.handleToggle}
                onDelete={props.handleDelete}
                onUpdate={props.handleUpdate}
                onUpdateDueDate={props.handleUpdateDueDate}
                canReschedule={currentPartition() === "outdated"}
              />
            )}
          </For>
        </div>
      </div>
    </main>
  );
}
