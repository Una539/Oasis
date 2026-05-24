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

import { createSignal, Show } from "solid-js";
import { Plus, Calendar, X } from "lucide-solid";
import InlineDatePicker from "./InlineDatePicker";
import { Popover } from "@ark-ui/solid";
import { Portal } from "solid-js/web";

interface TodoInputProps {
  onAdd: (content: string, dueDate: string | null) => Promise<boolean>;
}

export default function TodoInput(props: TodoInputProps) {
  const [newContent, setContent] = createSignal("");
  const [newDueDate, setNewDueDate] = createSignal("");
  const [open, setOpen] = createSignal(false);

  const addTodo = async (e: SubmitEvent) => {
    e.preventDefault();
    const content = newContent().trim();
    if (!content) return;

    const dueDate = newDueDate() || null;

    const success = await props.onAdd(content, dueDate);
    if (success) {
      setContent("");
      setNewDueDate("");
      setOpen(false);
    }
  };

  const handleDateChange = (value: string) => {
    setNewDueDate(value);
    setOpen(false);
  };

  const handleDateClear = () => {
    setNewDueDate("");
  };

  const isCalendarActive = () => !!(open() || newDueDate());

  return (
    <form class="flex flex-col gap-2 flex-shrink-0" onSubmit={addTodo}>
      {/* Input row */}
      <div class="todo-input-row flex items-stretch bg-surface border border-border overflow-hidden transition-colors duration-200">
        <input
          type="text"
          class="flex-1 border-none bg-transparent color-text text-[15px] px-4 py-3 outline-none min-h-12 placeholder:text-text-muted"
          placeholder="添加新待办..."
          value={newContent()}
          onInput={(e) => setContent(e.currentTarget.value)}
        />
        <div class="w-px bg-border flex-shrink-0" />

        <Popover.Root
          open={open()}
          onOpenChange={(e) => setOpen(e.open)}
          positioning={{ placement: "bottom-start", gutter: 8 }}
        >
          <Popover.Trigger
            type="button"
            class="flex items-center justify-center border-none bg-transparent cursor-pointer color-text-muted transition-all duration-150 flex-shrink-0 min-w-12 min-h-12 hover:color-text hover:bg-surface-hover active:scale-95"
            classList={{ "color-text bg-surface-hover": isCalendarActive() }}
            aria-label="选择截止日期"
            title="选择截止日期"
          >
            <Calendar size={20} />
          </Popover.Trigger>
          <Portal>
            <Popover.Positioner>
              <Popover.Content class="inline-date-picker z-50 bg-surface border border-border p-2 flex flex-col gap-1 shadow-md">
                <InlineDatePicker
                  value={newDueDate()}
                  onChange={handleDateChange}
                  onClear={handleDateClear}
                />
              </Popover.Content>
            </Popover.Positioner>
          </Portal>
        </Popover.Root>

        <button
          type="submit"
          class="flex items-center justify-center border-none !bg-text cursor-pointer color-bg transition-all duration-150 flex-shrink-0 min-w-12 min-h-12 hover:bg-text-secondary active:scale-95"
          aria-label="添加待办"
          title="添加待办 (Enter)"
        >
          <Plus size={22} />
        </button>
      </div>

      {/* Selected date chip */}
      <Show when={newDueDate()}>
        <div
          class="date-picker-field flex items-center gap-2 px-4 py-2.5 bg-surface border border-border color-text text-[14px] cursor-pointer transition-colors duration-200 hover:border-text-secondary"
          onClick={() => setOpen(true)}
        >
          <Calendar size={16} class="color-text-muted flex-shrink-0" />
          <span class="flex-1 text-[14px] color-text">{newDueDate()}</span>
          <button
            type="button"
            class="flex items-center justify-center border-none bg-transparent cursor-pointer color-text-muted p-1 rounded transition-all duration-150 hover:color-text hover:bg-surface-hover"
            onClick={(e) => {
              e.stopPropagation();
              handleDateClear();
            }}
            aria-label="清除日期"
            title="清除日期"
          >
            <X size={14} />
          </button>
        </div>
      </Show>
    </form>
  );
}
