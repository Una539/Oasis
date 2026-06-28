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
import { Calendar, Plus } from "lucide-solid";
import { getTodayDateString } from "../utils/date";
import DueDateChip from "./DueDateChip";

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

  const handleDateClear = () => {
    setNewDueDate("");
    setOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open && !newDueDate()) {
      setNewDueDate(getTodayDateString());
    }
    setOpen(open);
  };

  return (
    <form class="todo-input-form flex flex-col gap-2 flex-shrink-0" onSubmit={addTodo}>
      {/* Input row */}
      <div class="todo-input-row-shell">
        <div class="todo-input-row flex items-stretch bg-surface border border-border overflow-hidden transition-colors duration-200">
          <input
            type="text"
            class="flex-1 border-none bg-transparent color-text text-[15px] px-4 py-3 outline-none min-h-12 placeholder:text-text-muted"
            placeholder="添加新待办..."
            value={newContent()}
            onInput={(e) => setContent(e.currentTarget.value)}
          />
          <div class="w-px bg-border flex-shrink-0" />

          <button
            type="button"
            class="flex items-center justify-center border-none bg-transparent cursor-pointer color-text-muted transition-all duration-150 flex-shrink-0 min-w-12 min-h-12 hover:color-text hover:bg-surface-hover active:opacity-80"
            onClick={() => handleOpenChange(true)}
            aria-label="选择截止日期"
            title="选择截止日期"
          >
            <Calendar size={20} />
          </button>

          <button
            type="submit"
            class="flex items-center justify-center border-none !bg-text cursor-pointer color-bg transition-all duration-150 flex-shrink-0 min-w-12 min-h-12 hover:bg-text-secondary active:opacity-80"
            aria-label="添加待办"
            title="添加待办 (Enter)"
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      {/* Selected date chip */}
      <Show when={open() || newDueDate()}>
        <div class="date-chip-row">
          <DueDateChip
            open={open()}
            value={newDueDate()}
            onOpenChange={handleOpenChange}
            onValueChange={setNewDueDate}
            onClear={handleDateClear}
            triggerClass=""
            triggerLabel="选择截止日期"
            triggerTitle="选择截止日期"
            showValue
          />
        </div>
      </Show>
    </form>
  );
}
