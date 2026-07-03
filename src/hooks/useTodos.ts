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

import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { createStore } from "solid-js/store";
import {
  commands,
  type AppState as GeneratedAppState,
  type Tag,
  type Todo as GeneratedTodo,
} from "../bindings";
import { getTodayDateString } from "../utils/date";

export {
  type AppState,
  type Tag,
  type Todo,
  type CorePartitionKey,
  type ViewKey,
  type Partitions,
  type TodoStats,
};

type Todo = Omit<
  GeneratedTodo,
  "priority" | "tag_ids" | "reminder_enabled" | "completed_at" | "last_notified_on"
> & {
  priority: number;
  tag_ids: string[];
  reminder_enabled: boolean;
  completed_at: string | null;
  last_notified_on: string | null;
};

type AppState = {
  schema_version: number;
  todos: Todo[];
  tags: Tag[];
};

type CorePartitionKey = "today" | "upcoming" | "inbox" | "outdated" | "archived";
type ViewKey = CorePartitionKey | "stats" | `tag:${string}`;

type Partitions = Record<CorePartitionKey, Todo[]>;

interface TrendDay {
  date: string;
  label: string;
  count: number;
}

interface TodoStats {
  weekCompletedCount: number;
  streakDays: number;
  trend: TrendDay[];
}

const EMPTY_STATE: AppState = {
  schema_version: 2,
  todos: [],
  tags: [],
};

const CORE_PARTITION_KEYS: CorePartitionKey[] = [
  "today",
  "upcoming",
  "inbox",
  "outdated",
  "archived",
];

function isCorePartitionKey(view: ViewKey): view is CorePartitionKey {
  return CORE_PARTITION_KEYS.includes(view as CorePartitionKey);
}

function normalizeTodo(todo: GeneratedTodo): Todo {
  return {
    ...todo,
    priority: Math.min(Math.max(todo.priority ?? 3, 1), 5),
    tag_ids: todo.tag_ids ?? [],
    reminder_enabled: todo.reminder_enabled ?? false,
    completed_at: todo.completed_at ?? null,
    last_notified_on: todo.last_notified_on ?? null,
  };
}

function normalizeState(state: GeneratedAppState): AppState {
  return {
    schema_version: state.schema_version ?? 2,
    todos: (state.todos ?? []).map(normalizeTodo),
    tags: state.tags ?? [],
  };
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function partitionTodos(todos: Todo[]): Partitions {
  const today = getTodayDateString();

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

function getCompletionDate(todo: Todo): string | null {
  return todo.done ? todo.completed_at?.slice(0, 10) ?? null : null;
}

function calculateStats(todos: Todo[]): TodoStats {
  const today = new Date();
  const todayStr = toDateString(today);
  const weekStart = toDateString(startOfWeek(today));
  const completedDates = todos
    .map(getCompletionDate)
    .filter((date): date is string => date !== null);

  const weekCompletedCount = completedDates.filter(
    (date) => date >= weekStart && date <= todayStr,
  ).length;

  const completedDateSet = new Set(completedDates);
  let streakDays = 0;
  for (let offset = 0; ; offset += 1) {
    const date = toDateString(addDays(today, -offset));
    if (!completedDateSet.has(date)) break;
    streakDays += 1;
  }

  const trend = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index - 6);
    const dateString = toDateString(date);
    return {
      date: dateString,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      count: completedDates.filter((completedDate) => completedDate === dateString)
        .length,
    };
  });

  return {
    weekCompletedCount,
    streakDays,
    trend,
  };
}

function isTodayDueReminder(todo: Todo, today: string): boolean {
  return (
    !todo.done &&
    todo.reminder_enabled &&
    todo.due_date === today &&
    todo.last_notified_on !== today
  );
}

/**
 * 共享的 Todo 业务逻辑 Hook。
 * 被移动端和桌面端共同使用。
 */
export function useTodos() {
  const [state, setState] = createStore<AppState>(EMPTY_STATE);
  const [loaded, setLoaded] = createSignal(false);

  const applyState = (nextState: GeneratedAppState) => {
    setState(normalizeState(nextState));
  };

  onMount(async () => {
    try {
      const result = await commands.loadAppState();
      if (result.status === "ok") {
        applyState(result.data);
      } else {
        console.error("无法从 Rust 中加载数据：", result.error);
      }
    } catch (e) {
      console.error("无法从 Rust 中加载数据：", e);
    } finally {
      setLoaded(true);
    }
  });

  const todos = createMemo(() => state.todos);
  const tags = createMemo(() => state.tags);
  const partitions = createMemo(() => partitionTodos(state.todos));
  const stats = createMemo(() => calculateStats(state.todos));

  const handleCommandResult = (result: Awaited<ReturnType<typeof commands.loadAppState>>) => {
    if (result.status === "ok") {
      applyState(result.data);
      return true;
    }
    console.error("状态更新失败：", result.error);
    return false;
  };

  const handleAdd = async (
    content: string,
    dueDate: string | null,
    tagIds: string[],
  ) => {
    const result = await commands.addTodo(content, dueDate, tagIds);
    return handleCommandResult(result);
  };

  const handleDelete = async (id: string) => {
    const result = await commands.deleteTodo(id);
    handleCommandResult(result);
  };

  const handleToggle = async (id: string) => {
    const todo = state.todos.find((item) => item.id === id);
    const completedAt = todo?.done ? null : getTodayDateString();
    const result = await commands.toggleTodo(id, completedAt);
    handleCommandResult(result);
  };

  const handleUpdate = async (id: string, content: string) => {
    const result = await commands.updateTodoContent(id, content);
    handleCommandResult(result);
  };

  const handleUpdateDueDate = async (id: string, dueDate: string | null) => {
    const result = await commands.updateTodoDueDate(id, dueDate);
    handleCommandResult(result);
  };

  const handleUpdatePriority = async (id: string, priority: number) => {
    const result = await commands.updateTodoPriority(id, priority);
    handleCommandResult(result);
  };

  const handleUpdateTags = async (id: string, tagIds: string[]) => {
    const result = await commands.updateTodoTags(id, tagIds);
    handleCommandResult(result);
  };

  const handleUpdateReminder = async (id: string, reminderEnabled: boolean) => {
    const result = await commands.updateTodoReminder(id, reminderEnabled);
    handleCommandResult(result);
  };

  const handleCreateTag = async (name: string, color: string) => {
    const result = await commands.createTag(name, color);
    return handleCommandResult(result);
  };

  const handleApplyAppState = (nextState: GeneratedAppState) => {
    applyState(nextState);
  };

  const handleUpdateTag = async (id: string, name: string, color: string) => {
    const result = await commands.updateTag(id, name, color);
    handleCommandResult(result);
  };

  const handleDeleteTag = async (id: string) => {
    const result = await commands.deleteTag(id);
    handleCommandResult(result);
  };

  const getTodosForView = (view: ViewKey): Todo[] => {
    if (view === "stats") return [];
    if (view.startsWith("tag:")) {
      const tagId = view.slice(4);
      return state.todos.filter((todo) => todo.tag_ids.includes(tagId));
    }
    if (isCorePartitionKey(view)) {
      return partitions()[view];
    }
    return [];
  };

  let notificationInFlight = false;

  const runDueNotifications = async () => {
    if (!loaded() || notificationInFlight) return;

    const today = getTodayDateString();
    const pendingTodos = state.todos.filter((todo) =>
      isTodayDueReminder(todo, today),
    );
    if (pendingTodos.length === 0) return;

    notificationInFlight = true;
    try {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === "granted";
      }

      if (!permissionGranted) return;

      for (const todo of pendingTodos) {
        sendNotification({
          title: "Oasis 今日待办",
          body: todo.content,
        });
        const result = await commands.markTodoNotified(todo.id, today);
        handleCommandResult(result);
      }
    } catch (error) {
      console.error("发送提醒失败：", error);
    } finally {
      notificationInFlight = false;
    }
  };

  createEffect(() => {
    if (!loaded()) return;
    void runDueNotifications();
  });

  onMount(() => {
    const handleFocus = () => {
      void runDueNotifications();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void runDueNotifications();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    onCleanup(() => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    });
  });

  return {
    state,
    todos,
    tags,
    partitions,
    stats,
    getTodosForView,
    handleAdd,
    handleDelete,
    handleToggle,
    handleUpdate,
    handleUpdateDueDate,
    handleUpdatePriority,
    handleUpdateTags,
    handleUpdateReminder,
    handleCreateTag,
    handleApplyAppState,
    handleUpdateTag,
    handleDeleteTag,
  };
}
