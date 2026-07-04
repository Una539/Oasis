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
import { Checkbox } from "@ark-ui/solid/checkbox";
import { Calendar, CheckIcon, Plus } from "lucide-solid";
import { getTodayDateString } from "../utils/date";
import DueDateChip from "./DueDateChip";

interface TodoInputProps {
  onAdd: (
    content: string,
    plannedDate: string | null,
    dueDate: string | null,
  ) => Promise<boolean>;
}

export default function TodoInput(props: TodoInputProps) {
  const [newContent, setContent] = createSignal("");
  const [newDate, setNewDate] = createSignal("");
  const [required, setRequired] = createSignal(false);
  const [dateOpen, setDateOpen] = createSignal(false);
  let handledDateTogglePointer = false;

  const addTodo = async (e: SubmitEvent) => {
    e.preventDefault();
    const content = newContent().trim();
    if (!content) return;

    const selectedDate = newDate() || null;
    const plannedDate = required() ? null : selectedDate;
    const dueDate = required() ? selectedDate : null;

    const success = await props.onAdd(content, plannedDate, dueDate);
    if (success) {
      setContent("");
      setNewDate("");
      setRequired(false);
      setDateOpen(false);
    }
  };

  const handleDateClear = () => {
    setNewDate("");
    setDateOpen(false);
  };

  const handleDateOpenChange = (open: boolean) => {
    if (open && !newDate()) {
      setNewDate(getTodayDateString());
    }
    setDateOpen(open);
  };

  const toggleDateOpen = () => {
    handleDateOpenChange(!dateOpen());
  };

  return (
    <form class="todo-input-form flex flex-col gap-2 flex-shrink-0" onSubmit={addTodo}>
      {/* Input row */}
      <div class="todo-input-row-shell">
        <div class="todo-input-row flex items-stretch bg-surface border border-border transition-colors duration-200">
          <input
            type="text"
            value={newContent()}
            placeholder="添加新待办..."
            class="flex-1 border-none bg-transparent color-text text-[15px] px-4 py-3 outline-none min-h-12 placeholder:text-text-muted"
            onInput={(event) => setContent(event.currentTarget.value)}
          />
          <div class="w-px bg-border flex-shrink-0" />

          <button
            type="button"
            class="todo-input-action-button calendar flex items-center justify-center border-none bg-transparent cursor-pointer color-text-muted transition-all duration-150 flex-shrink-0 min-w-12 min-h-12 hover:color-text hover:bg-surface-hover active:opacity-80"
            onPointerDown={(event) => {
              event.preventDefault();
              handledDateTogglePointer = true;
              toggleDateOpen();
            }}
            onClick={() => {
              if (handledDateTogglePointer) {
                handledDateTogglePointer = false;
                return;
              }
              toggleDateOpen();
            }}
            aria-label={required() ? "选择必做日期" : "选择想做日期"}
            title={required() ? "选择必做日期" : "选择想做日期"}
            aria-pressed={dateOpen()}
          >
            <Calendar size={20} />
          </button>

          <Checkbox.Root
            class="todo-required-checkbox"
            checked={required()}
            onCheckedChange={(details) => setRequired(details.checked === true)}
            title="标记为必做"
          >
            <Checkbox.Control class="todo-required-checkbox-control">
              <Checkbox.Indicator class="todo-required-checkbox-indicator">
                <CheckIcon size={12} strokeWidth={2.5} />
              </Checkbox.Indicator>
            </Checkbox.Control>
            <Checkbox.Label class="todo-required-checkbox-label">必做</Checkbox.Label>
            <Checkbox.HiddenInput />
          </Checkbox.Root>

          <button
            type="submit"
            class="todo-input-action-button submit flex items-center justify-center border-none !bg-text cursor-pointer color-bg transition-all duration-150 flex-shrink-0 min-w-12 min-h-12 hover:bg-text-secondary active:opacity-80"
            aria-label="添加待办"
            title="添加待办 (Enter)"
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      {/* Date input popover */}
      <Show when={dateOpen()}>
        <div class="date-chip-row">
          <DueDateChip
            open={dateOpen()}
            value={newDate()}
            onOpenChange={handleDateOpenChange}
            onValueChange={setNewDate}
            onClear={handleDateClear}
            triggerClass=""
            triggerLabel={required() ? "必做日期" : "想做日期"}
            triggerTitle={required() ? "选择必做日期" : "选择想做日期"}
            showValue
          />
        </div>
      </Show>
    </form>
  );
}
