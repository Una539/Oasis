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

import { For } from "solid-js";
import { type Todo } from "../hooks/useTodos";
import TodoInput from "./TodoInput";
import MobileTodoItem from "./MobileTodoItem";

interface MobileAppProps {
  todos: Todo[];
  handleAdd: (content: string, dueDate: string | null) => Promise<boolean>;
  handleDelete: (id: string) => Promise<void>;
  handleToggle: (id: string) => Promise<void>;
  handleUpdate: (id: string, content: string) => Promise<void>;
}

export default function MobileApp(props: MobileAppProps) {
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
        pb-2
        bg-surface
        border-b
        border-border
      >
        <h1 text-xl font-bold text-text tracking-tight>
          Oasis
        </h1>
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

        <div flex-1 overflow-y-auto overflow-x-hidden pr-1>
          <For each={props.todos}>
            {(todo) => (
              <MobileTodoItem
                todo={todo}
                onToggle={props.handleToggle}
                onDelete={props.handleDelete}
                onUpdate={props.handleUpdate}
              />
            )}
          </For>
        </div>
      </div>
    </main>
  );
}
