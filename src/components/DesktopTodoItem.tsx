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

import { X } from "lucide-solid";
import { type Todo } from "../hooks/useTodos";

interface DesktopTodoItemProps {
  todo: Todo;
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, content: string) => Promise<void>;
}

export default function DesktopTodoItem(props: DesktopTodoItemProps) {
  return (
    <div
      class="group"
      flex
      items-center
      bg-surface
      rounded-desktop
      border
      border-transparent
      overflow-hidden
      transition="all duration-200 ease"
      relative
      z-1
      mb-2
      hover="border-border shadow-md"
    >
      <input
        type="checkbox"
        class="todo-checkbox"
        checked={props.todo.done}
        onChange={() => props.onToggle(props.todo.id)}
      />
        <input
          type="text"
          class={`todo-text-input ${props.todo.done ? "done" : ""}`}
          value={props.todo.content}
          onChange={(e) =>
            props.onUpdate(props.todo.id, e.currentTarget.value)
          }
        />
      {props.todo.due_date && (
        <span
          text="[12px]"
          color-text-secondary
          mr-3
          whitespace-nowrap
          flex-shrink-0
        >
          {props.todo.due_date}
        </span>
      )}
      <button
        class="hidden group-hover:flex"
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
