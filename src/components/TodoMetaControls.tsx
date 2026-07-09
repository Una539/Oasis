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

import { Bell, BellOff } from "lucide-solid";
import { For } from "solid-js";
import { type Todo } from "../hooks/useTodos";
import { getPriorityColor } from "../utils/tags";

interface TodoMetaControlsProps {
  todo: Todo;
  onUpdatePriority: (id: string, priority: number) => Promise<void>;
  onUpdateReminder: (id: string, reminderEnabled: boolean) => Promise<void>;
  hideReminder?: boolean;
}

const PRIORITIES = [1, 2, 3, 4, 5];

export default function TodoMetaControls(props: TodoMetaControlsProps) {
  return (
    <div class="todo-meta-controls">
      <div class="priority-picker" aria-label="优先级">
        <For each={PRIORITIES}>
          {(priority) => (
            <button
              type="button"
              class={props.todo.priority === priority ? "priority-dot active" : "priority-dot"}
              style={{ "background-color": getPriorityColor(priority) }}
              onClick={() => props.onUpdatePriority(props.todo.id, priority)}
              title={`优先级 ${priority}`}
              aria-label={`设置优先级 ${priority}`}
            />
          )}
        </For>
      </div>

      {!props.hideReminder && (
        <button
          type="button"
          class={props.todo.reminder_enabled ? "reminder-toggle active" : "reminder-toggle"}
          onClick={() =>
            props.onUpdateReminder(props.todo.id, !props.todo.reminder_enabled)
          }
          title={props.todo.reminder_enabled ? "关闭提醒" : "开启今日提醒"}
          aria-label={props.todo.reminder_enabled ? "关闭提醒" : "开启今日提醒"}
        >
          {props.todo.reminder_enabled ? <Bell size={14} /> : <BellOff size={14} />}
        </button>
      )}
    </div>
  );
}
