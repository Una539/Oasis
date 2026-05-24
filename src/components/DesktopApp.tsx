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
import DesktopTodoItem from "./DesktopTodoItem";

interface DesktopAppProps {
  todos: Todo[];
  handleAdd: (content: string, dueDate: string | null) => Promise<boolean>;
  handleDelete: (id: string) => Promise<void>;
  handleToggle: (id: string) => Promise<void>;
  handleUpdate: (id: string, content: string) => Promise<void>;
}

export default function DesktopApp(props: DesktopAppProps) {
  return (
    <main flex justify-center h-full bg-bg overflow-hidden>
      {/* No title bar - uses system title bar */}
      <div
        w-full
        max-w-120
        px-5
        pt-6
        pb-5
        flex
        flex-col
        gap-3
        h-full
        box-border
      >
        <TodoInput onAdd={props.handleAdd} />

        <div flex-1 overflow-y-auto overflow-x-hidden pr-1>
          <For each={props.todos}>
            {(todo) => (
              <DesktopTodoItem
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
