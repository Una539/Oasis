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

import { createEffect, createSignal } from "solid-js";
import { X } from "lucide-solid";
import { type Todo } from "../hooks/useTodos";
import { getTodayDateString } from "../utils/date";
import { getPriorityColor } from "../utils/tags";
import DueDateChip from "./DueDateChip";
import TodoMetaControls from "./TodoMetaControls";

interface DesktopTodoItemProps {
  todo: Todo;
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, content: string) => Promise<void>;
  onUpdatePlannedDate: (id: string, plannedDate: string | null) => Promise<void>;
  onUpdateDueDate: (id: string, dueDate: string | null) => Promise<void>;
  onUpdatePriority: (id: string, priority: number) => Promise<void>;
  onUpdateReminder: (id: string, reminderEnabled: boolean) => Promise<void>;
}

export default function DesktopTodoItem(props: DesktopTodoItemProps) {
  const [draftContent, setDraftContent] = createSignal(props.todo.content);
  const [plannedDatePickerOpen, setPlannedDatePickerOpen] = createSignal(false);
  const [draftPlannedDate, setDraftPlannedDate] = createSignal("");
  const [datePickerOpen, setDatePickerOpen] = createSignal(false);
  const [draftDueDate, setDraftDueDate] = createSignal("");

  createEffect(() => {
    setDraftContent(props.todo.content);
  });

  const commitContent = async () => {
    const content = draftContent().trim();
    if (!content || content === props.todo.content) return;
    await props.onUpdate(props.todo.id, content);
  };

  const handlePlannedDateClear = async () => {
    await props.onUpdatePlannedDate(props.todo.id, null);
    setPlannedDatePickerOpen(false);
    setDraftPlannedDate("");
  };

  const handleDateClear = async () => {
    await props.onUpdateDueDate(props.todo.id, null);
    setDatePickerOpen(false);
    setDraftDueDate("");
  };

  const handlePlannedOpenChange = (open: boolean) => {
    setPlannedDatePickerOpen(open);
    setDraftPlannedDate(open ? getTodayDateString() : "");
  };

  const handleOpenChange = (open: boolean) => {
    setDatePickerOpen(open);
    setDraftDueDate(open ? getTodayDateString() : "");
  };

  const dueDateClass = () => {
    if (!props.todo.due_date) return "due-date-badge";
    const today = getTodayDateString();
    if (props.todo.due_date === today) return "due-date-badge today";
    if (!props.todo.done && props.todo.due_date < today) return "due-date-badge overdue";
    return "due-date-badge";
  };

  return (
    <div
      class="group"
      flex
      items-center
      bg-surface
      rounded="[5px]"
      border
      border-transparent
      transition="all duration-200 ease"
      relative
      z-1
      mb-3
      hover="border-border shadow-md"
      style={{ "--priority-color": getPriorityColor(props.todo.priority) }}
    >
      <div class="priority-stripe" />
      <input
        type="checkbox"
        class="todo-checkbox"
        checked={props.todo.done}
        onChange={() => props.onToggle(props.todo.id)}
      />
      <input
        type="text"
        class={props.todo.done ? "todo-text-input done" : "todo-text-input"}
        value={draftContent()}
        onInput={(event) => setDraftContent(event.currentTarget.value)}
        onBlur={() => void commitContent()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
      />
      <TodoMetaControls
        todo={props.todo}
        onUpdatePriority={props.onUpdatePriority}
        onUpdateReminder={props.onUpdateReminder}
      />
      {props.todo.planned_date && (
        <span class="due-date-badge" text="[12px]" whitespace-nowrap flex-shrink-0>
          想 {props.todo.planned_date}
        </span>
      )}
      {props.todo.due_date && (
        <span
          class={dueDateClass()}
          text="[12px]"
          whitespace-nowrap
          flex-shrink-0
        >
          截 {props.todo.due_date}
        </span>
      )}
      <DueDateChip
        open={plannedDatePickerOpen()}
        value={draftPlannedDate() || props.todo.planned_date || ""}
        onOpenChange={handlePlannedOpenChange}
        onValueChange={(value) => {
          setDraftPlannedDate(value);
          void props.onUpdatePlannedDate(props.todo.id, value || null);
        }}
        onClear={handlePlannedDateClear}
        triggerClass="todo-icon-button"
        triggerLabel="设置想做日期"
        triggerTitle="想做日期"
        showValue={false}
      />
      <DueDateChip
        open={datePickerOpen()}
        value={draftDueDate() || props.todo.due_date || ""}
        onOpenChange={handleOpenChange}
        onValueChange={(value) => {
          setDraftDueDate(value);
          void props.onUpdateDueDate(props.todo.id, value || null);
        }}
        onClear={handleDateClear}
        triggerClass="todo-icon-button"
        triggerLabel="设置截止日期"
        triggerTitle="截止日期"
        showValue={false}
      />
      <button
        class="todo-delete-button"
        items-center
        justify-center
        w-11
        self-stretch
        bg-transparent
        border-none
        cursor-pointer
        transition="all duration-200 ease"
        m-0
        rounded="r-desktop l-none"
        color-text-secondary
        hover="bg-surface-hover text-text"
        active="scale-92"
        onClick={() => props.onDelete(props.todo.id)}
        aria-label="删除这个待办"
        title="删除 (Delete)"
      >
        <X size={18} />
      </button>
    </div>
  );
}
