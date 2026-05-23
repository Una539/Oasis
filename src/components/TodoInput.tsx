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

// TodoList 输入框
import { createSignal } from "solid-js";
import { Plus, Calendar } from "lucide-solid";
import "./TodoInput.css";

interface TodoInputProps {
  onAdd: (content: string, dueDate: string | null) => Promise<boolean>;
}

export default function TodoInput(props: TodoInputProps) {
  const [newContent, setContent] = createSignal("");
  const [newDueDate, setNewDueDate] = createSignal("");
  const [showDatePicker, setShowDatePicker] = createSignal(false);

  const addTodo = async (e: SubmitEvent) => {
    e.preventDefault();
    const content = newContent().trim();
    if (!content) return;

    const dueDate = newDueDate() || null;

    const success = await props.onAdd(content, dueDate);
    if (success) {
      setContent("");
      setNewDueDate("");
      setShowDatePicker(false);
    }
  };

  return (
    <form onSubmit={addTodo}>
      <div class="input-row">
        <input
          placeholder="enter todo and click +"
          class="input"
          required
          value={newContent()}
          onInput={(e) => setContent(e.currentTarget.value)}
        />
        <button
          type="button"
          class="calendar-btn"
          classList={{ active: showDatePicker() }}
          onClick={() => setShowDatePicker(!showDatePicker())}
          aria-label="选择截止日期"
        >
          <Calendar size={20} />
        </button>
        <button class="input-btn" type="submit" aria-label="添加待办">
          <Plus size={24} />
        </button>
      </div>
      {showDatePicker() && (
        <input
          type="date"
          class="date-picker"
          value={newDueDate()}
          onInput={(e) => setNewDueDate(e.currentTarget.value)}
        />
      )}
    </form>
  );
}
