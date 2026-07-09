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
  type FocusRouteRecommendation as GeneratedFocusRouteRecommendation,
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
  type SearchPartitionKey,
  type SearchResultGroup,
  type FocusRouteRecommendation,
  type TodoStats,
};

type Todo = Omit<
  GeneratedTodo,
  | "planned_date"
  | "priority"
  | "tag_ids"
  | "reminder_enabled"
  | "completed_at"
  | "last_notified_on"
> & {
  planned_date: string | null;
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

type CorePartitionKey = "today" | "upcoming" | "inbox";
type ViewKey = CorePartitionKey | "stats";
type SearchPartitionKey = CorePartitionKey | "completed";

type Partitions = Record<CorePartitionKey, Todo[]>;
type SearchResultGroup = {
  key: SearchPartitionKey;
  label: string;
  todos: Todo[];
};
type FocusRouteRecommendation = GeneratedFocusRouteRecommendation & {
  target_view: CorePartitionKey;
};

interface TrendDay {
  date: string;
  label: string;
  count: number;
}

interface RecentCompletedTodo {
  id: string;
  content: string;
  completedAt: string;
}

interface TodoStats {
  weekCompletedCount: number;
  streakDays: number;
  trend: TrendDay[];
  recentCompleted: RecentCompletedTodo[];
}

const EMPTY_STATE: AppState = {
  schema_version: 3,
  todos: [],
  tags: [],
};

const CORE_PARTITION_KEYS: CorePartitionKey[] = ["today", "upcoming", "inbox"];
const SEARCH_GROUP_LABELS: Record<SearchPartitionKey, string> = {
  today: "今日",
  upcoming: "以后",
  inbox: "灵感",
  completed: "已完成",
};

function isCorePartitionKey(view: ViewKey): view is CorePartitionKey {
  return CORE_PARTITION_KEYS.includes(view as CorePartitionKey);
}

function normalizeTodo(todo: GeneratedTodo): Todo {
  return {
    ...todo,
    planned_date: todo.planned_date ?? null,
    priority: Math.min(Math.max(todo.priority ?? 3, 1), 5),
    tag_ids: todo.tag_ids ?? [],
    reminder_enabled: todo.reminder_enabled ?? false,
    completed_at: todo.completed_at ?? null,
    last_notified_on: todo.last_notified_on ?? null,
  };
}

function normalizeState(state: GeneratedAppState): AppState {
  return {
    schema_version: state.schema_version ?? 3,
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
  const result: Partitions = {
    today: [],
    upcoming: [],
    inbox: [],
  };

  for (const todo of todos) {
    if (todo.done === true) {
      continue;
    }

    result[getTodoPartition(todo)].push(todo);
  }

  return result;
}

function getTodoPartition(todo: Todo): CorePartitionKey {
  const today = getTodayDateString();
  const plannedDate = todo.planned_date;
  const dueDate = todo.due_date;

  if (
    (plannedDate !== null && plannedDate <= today) ||
    (dueDate !== null && dueDate <= today)
  ) {
    return "today";
  }

  if (
    (plannedDate !== null && plannedDate > today) ||
    (dueDate !== null && dueDate > today)
  ) {
    return "upcoming";
  }

  return "inbox";
}

function getTodoSearchText(todo: Todo): string {
  return [
    todo.content,
    todo.planned_date ? `想做 ${todo.planned_date}` : "",
    todo.due_date ? `截止 ${todo.due_date}` : "",
    todo.completed_at ? `完成 ${todo.completed_at}` : "",
    `p${todo.priority}`,
    `!${todo.priority}`,
    `优先级 ${todo.priority}`,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

function matchesSearchQuery(todo: Todo, query: string): boolean {
  const terms = query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (terms.length === 0) return false;

  const haystack = getTodoSearchText(todo);
  return terms.every((term) => haystack.includes(term));
}

function buildSearchResultGroups(todos: Todo[], query: string): SearchResultGroup[] {
  const grouped: Record<SearchPartitionKey, Todo[]> = {
    today: [],
    upcoming: [],
    inbox: [],
    completed: [],
  };

  for (const todo of todos) {
    if (!matchesSearchQuery(todo, query)) continue;
    const key = todo.done ? "completed" : getTodoPartition(todo);
    grouped[key].push(todo);
  }

  const order: SearchPartitionKey[] = ["today", "upcoming", "inbox", "completed"];
  return order
    .map((key) => ({
      key,
      label: SEARCH_GROUP_LABELS[key],
      todos: grouped[key],
    }))
    .filter((group) => group.todos.length > 0);
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

  const recentCompleted = todos
    .filter((todo) => todo.done && todo.completed_at !== null)
    .sort((left, right) => right.completed_at!.localeCompare(left.completed_at!))
    .slice(0, 5)
    .map((todo) => ({
      id: todo.id,
      content: todo.content,
      completedAt: todo.completed_at!,
    }));

  return {
    weekCompletedCount,
    streakDays,
    trend,
    recentCompleted,
  };
}

function shouldSendStartupReminder(todo: Todo, today: string): boolean {
  return (
    !todo.done &&
    todo.reminder_enabled &&
    ((todo.planned_date !== null && todo.planned_date <= today) ||
      (todo.due_date !== null && todo.due_date <= today))
  );
}

/**
 * 共享的 Todo 业务逻辑 Hook。
 * 被移动端和桌面端共同使用。
 */
export function useTodos() {
  const [state, setState] = createStore<AppState>(EMPTY_STATE);
  const [loaded, setLoaded] = createSignal(false);
  const [focusRecommendation, setFocusRecommendation] =
    createSignal<FocusRouteRecommendation | null>(null);

  const applyState = (nextState: GeneratedAppState) => {
    setState(normalizeState(nextState));
  };

  onMount(async () => {
    try {
      const result = await commands.loadAppState();
      if (result.status === "ok") {
        applyState(result.data);
        void requestFocusRecommendation("today");
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

  const normalizeFocusRecommendation = (
    recommendation: GeneratedFocusRouteRecommendation | null,
  ): FocusRouteRecommendation | null => {
    if (
      recommendation !== null &&
      isCorePartitionKey(recommendation.target_view as ViewKey)
    ) {
      return {
        ...recommendation,
        target_view: recommendation.target_view as CorePartitionKey,
      };
    }
    return null;
  };

  const requestFocusRecommendation = async (currentView: CorePartitionKey) => {
    try {
      const result = await commands.checkFocusRoute(
        currentView,
        getTodayDateString(),
      );
      if (result.status === "ok") {
        setFocusRecommendation(normalizeFocusRecommendation(result.data));
      } else {
        console.error("后台聚焦检查失败：", result.error);
      }
    } catch (error) {
      console.error("后台聚焦检查失败：", error);
    }
  };

  const clearFocusRecommendation = () => {
    setFocusRecommendation(null);
  };

  const handleAdd = async (
    content: string,
    plannedDate: string | null,
    dueDate: string | null,
  ) => {
    const result = await commands.addTodo(content, plannedDate, dueDate, getTodayDateString());
    setFocusRecommendation(null);
    return handleCommandResult(result);
  };

  const handleDelete = async (id: string) => {
    const result = await commands.deleteTodo(id);
    handleCommandResult(result);
  };

  const handleToggle = async (id: string, currentView?: CorePartitionKey) => {
    const todo = state.todos.find((item) => item.id === id);
    const willComplete = todo?.done === false;
    const completedAt = todo?.done ? null : getTodayDateString();
    const result = await commands.toggleTodo(id, completedAt);
    if (handleCommandResult(result) && willComplete && currentView) {
      void requestFocusRecommendation(currentView);
    }
  };

  const handleUpdate = async (id: string, content: string) => {
    const result = await commands.updateTodoContent(id, content);
    handleCommandResult(result);
  };

  const handleUpdatePlannedDate = async (id: string, plannedDate: string | null) => {
    const result = await commands.updateTodoPlannedDate(id, plannedDate);
    handleCommandResult(result);
    setFocusRecommendation(null);
  };

  const handleUpdateDueDate = async (id: string, dueDate: string | null) => {
    const result = await commands.updateTodoDueDate(id, dueDate);
    handleCommandResult(result);
    setFocusRecommendation(null);
  };

  const handleUpdatePriority = async (id: string, priority: number) => {
    const result = await commands.updateTodoPriority(id, priority);
    handleCommandResult(result);
  };

  const handleUpdateTags = async (id: string, tagIds: string[]) => {
    const result = await commands.updateTodoTags(id, tagIds);
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
    if (isCorePartitionKey(view)) {
      return partitions()[view];
    }
    return [];
  };

  let notificationInFlight = false;
  const notifiedThisLaunch = new Set<string>();

  const handleUpdateReminder = async (id: string, reminderEnabled: boolean) => {
    const result = await commands.updateTodoReminder(id, reminderEnabled);
    if (handleCommandResult(result)) {
      if (!reminderEnabled) {
        notifiedThisLaunch.delete(id);
      } else {
        void runDueNotifications();
      }
    }
  };

  const runDueNotifications = async () => {
    if (!loaded() || notificationInFlight) return;

    const today = getTodayDateString();
    const pendingTodos = state.todos.filter(
      (todo) =>
        !notifiedThisLaunch.has(todo.id) && shouldSendStartupReminder(todo, today),
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
        notifiedThisLaunch.add(todo.id);
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
    focusRecommendation,
    stats,
    buildSearchResultGroups: (query: string) =>
      buildSearchResultGroups(state.todos, query),
    getTodosForView,
    runDueNotifications,
    requestFocusRecommendation,
    clearFocusRecommendation,
    handleAdd,
    handleDelete,
    handleToggle,
    handleUpdate,
    handleUpdatePlannedDate,
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
