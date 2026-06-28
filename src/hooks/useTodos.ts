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

import { createTauriStore, Todo } from "../rsstore";
import { commands } from "../bindings";
import { createMemo } from "solid-js";

export { type Todo, type PartitionKey, type Partitions };

type PartitionKey = "today" | "upcoming" | "inbox" | "outdated" | "archived";

type Partitions = Record<PartitionKey, Todo[]>;

function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function partitionTodos(todos: Todo[]): Partitions {
  const today = getTodayStr();

  const result: Partitions = {
    today: [],
    upcoming: [],
    inbox: [],
    outdated: [],
    archived: [],
  };

  for (const todo of todos) {
    if (todo.done === true) {
      result.archived.push(todo);
    } else if (todo.due_date === null) {
      result.inbox.push(todo);
    } else if (todo.due_date === today) {
      result.today.push(todo);
    } else if (todo.due_date < today) {
      result.outdated.push(todo);
    } else {
      result.upcoming.push(todo);
    }
  }

  return result;
}

/**
 * 共享的 Todo 业务逻辑 Hook。
 * 被移动端和桌面端共同使用。
 */
export function useTodos() {
  const [todos, setTodos] = createTauriStore<Todo[]>([]);

  const partitions = createMemo(() => partitionTodos(todos));

  const handleAdd = async (content: string, dueDate: string | null) => {
    const result = await commands.addTodo(content, dueDate);
    if (result.status === "ok") {
      setTodos(result.data);
      return true;
    }
    console.error("添加失败：", result.error);
    return false;
  };

  const handleDelete = async (id: string) => {
    const result = await commands.deleteTodo(id);
    if (result.status === "ok") {
      setTodos(result.data);
    } else {
      console.error("删除失败：", result.error);
    }
  };

  const handleToggle = async (id: string) => {
    const result = await commands.toggleTodo(id);
    if (result.status === "ok") {
      setTodos(result.data);
    } else {
      console.error("切换状态失败：", result.error);
    }
  };

  const handleUpdate = async (id: string, content: string) => {
    const result = await commands.updateTodoContent(id, content);
    if (result.status === "ok") {
      setTodos(result.data);
    } else {
      console.error("更新内容失败：", result.error);
    }
  };

  const handleUpdateDueDate = async (id: string, dueDate: string | null) => {
    const result = await commands.updateTodoDueDate(id, dueDate);
    if (result.status === "ok") {
      setTodos(result.data);
    } else {
      console.error("更新截止日期失败：", result.error);
    }
  };

  return {
    todos,
    partitions,
    handleAdd,
    handleDelete,
    handleToggle,
    handleUpdate,
    handleUpdateDueDate,
  };
}
