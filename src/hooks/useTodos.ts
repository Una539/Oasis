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
  type AppSnapshot as GeneratedAppSnapshot,
  type AppState as GeneratedAppState,
  type AppViewState as GeneratedAppViewState,
  type FocusRouteRecommendation as GeneratedFocusRouteRecommendation,
  type ReminderCandidate,
  type SearchResultGroup as GeneratedSearchResultGroup,
  type Tag,
  type Todo as GeneratedTodo,
  type TodoPartitions as GeneratedTodoPartitions,
  type TodoStats as GeneratedTodoStats,
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

const EMPTY_PARTITIONS: Partitions = {
  today: [],
  upcoming: [],
  inbox: [],
};

const EMPTY_STATS: TodoStats = {
  weekCompletedCount: 0,
  streakDays: 0,
  trend: [],
  recentCompleted: [],
};

const CORE_PARTITION_KEYS: CorePartitionKey[] = ["today", "upcoming", "inbox"];
const SEARCH_PARTITION_KEYS: SearchPartitionKey[] = [
  "today",
  "upcoming",
  "inbox",
  "completed",
];

function isCorePartitionKey(view: ViewKey): view is CorePartitionKey {
  return CORE_PARTITION_KEYS.includes(view as CorePartitionKey);
}

function isSearchPartitionKey(view: string): view is SearchPartitionKey {
  return SEARCH_PARTITION_KEYS.includes(view as SearchPartitionKey);
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

function normalizePartitions(partitions: GeneratedTodoPartitions): Partitions {
  return {
    today: (partitions.today ?? []).map(normalizeTodo),
    upcoming: (partitions.upcoming ?? []).map(normalizeTodo),
    inbox: (partitions.inbox ?? []).map(normalizeTodo),
  };
}

function normalizeStats(stats: GeneratedTodoStats): TodoStats {
  return {
    weekCompletedCount: stats.week_completed_count ?? 0,
    streakDays: stats.streak_days ?? 0,
    trend: stats.trend ?? [],
    recentCompleted: (stats.recent_completed ?? []).map((todo) => ({
      id: todo.id,
      content: todo.content,
      completedAt: todo.completed_at,
    })),
  };
}

function normalizeAppView(view: GeneratedAppViewState) {
  return {
    partitions: normalizePartitions(view.partitions),
    stats: normalizeStats(view.stats),
  };
}

function normalizeSearchGroups(
  groups: GeneratedSearchResultGroup[],
): SearchResultGroup[] {
  return groups.flatMap((group) => {
    if (!isSearchPartitionKey(group.key)) return [];
    return [
      {
        key: group.key,
        label: group.label,
        todos: group.todos.map(normalizeTodo),
      },
    ];
  });
}

/**
 * 共享的 Todo UI hook。
 * 业务派生数据由 Rust 后端计算，前端只保留交互状态和命令编排。
 */
export function useTodos() {
  const [state, setState] = createStore<AppState>(EMPTY_STATE);
  const [view, setView] = createStore({
    partitions: EMPTY_PARTITIONS,
    stats: EMPTY_STATS,
  });
  const [loaded, setLoaded] = createSignal(false);
  const [focusRecommendation, setFocusRecommendation] =
    createSignal<FocusRouteRecommendation | null>(null);

  const applyState = (nextState: GeneratedAppState) => {
    setState(normalizeState(nextState));
  };

  const applySnapshot = (snapshot: GeneratedAppSnapshot) => {
    applyState(snapshot.state);
    setView(normalizeAppView(snapshot.view));
  };

  const reloadSnapshot = async () => {
    const result = await commands.loadAppSnapshot(getTodayDateString());
    if (result.status === "ok") {
      applySnapshot(result.data);
      return true;
    }

    console.error("无法从 Rust 中加载快照：", result.error);
    return false;
  };

  const handleSnapshotResult = (
    result:
      | { status: "ok"; data: GeneratedAppSnapshot }
      | { status: "error"; error: string },
  ) => {
    if (result.status === "ok") {
      applySnapshot(result.data);
      return true;
    } else {
      console.error("状态更新失败：", result.error);
      return false;
    }
  };

  onMount(async () => {
    try {
      if (await reloadSnapshot()) {
        void requestFocusRecommendation("today");
      }
    } catch (e) {
      console.error("无法从 Rust 中加载数据：", e);
    } finally {
      setLoaded(true);
    }
  });

  const todos = createMemo(() => state.todos);
  const tags = createMemo(() => state.tags);
  const partitions = createMemo(() => view.partitions);
  const stats = createMemo(() => view.stats);

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
    return handleSnapshotResult(result);
  };

  const handleDelete = async (id: string) => {
    const result = await commands.deleteTodo(id, getTodayDateString());
    handleSnapshotResult(result);
  };

  const handleToggle = async (id: string, currentView?: CorePartitionKey) => {
    const todo = state.todos.find((item) => item.id === id);
    const willComplete = todo?.done === false;
    const completedAt = todo?.done ? null : getTodayDateString();
    const result = await commands.toggleTodo(id, completedAt, getTodayDateString());
    if (handleSnapshotResult(result) && willComplete && currentView) {
      void requestFocusRecommendation(currentView);
    }
  };

  const handleUpdate = async (id: string, content: string) => {
    const result = await commands.updateTodoContent(id, content, getTodayDateString());
    handleSnapshotResult(result);
  };

  const handleUpdatePlannedDate = async (id: string, plannedDate: string | null) => {
    const result = await commands.updateTodoPlannedDate(
      id,
      plannedDate,
      getTodayDateString(),
    );
    handleSnapshotResult(result);
    setFocusRecommendation(null);
  };

  const handleUpdateDueDate = async (id: string, dueDate: string | null) => {
    const result = await commands.updateTodoDueDate(id, dueDate, getTodayDateString());
    handleSnapshotResult(result);
    setFocusRecommendation(null);
  };

  const handleUpdatePriority = async (id: string, priority: number) => {
    const result = await commands.updateTodoPriority(id, priority, getTodayDateString());
    handleSnapshotResult(result);
  };

  const handleUpdateTags = async (id: string, tagIds: string[]) => {
    const result = await commands.updateTodoTags(id, tagIds, getTodayDateString());
    handleSnapshotResult(result);
  };

  const handleCreateTag = async (name: string, color: string) => {
    const result = await commands.createTag(name, color, getTodayDateString());
    return handleSnapshotResult(result);
  };

  const handleApplyAppState = (nextState: GeneratedAppState) => {
    applyState(nextState);
    void reloadSnapshot();
  };

  const handleUpdateTag = async (id: string, name: string, color: string) => {
    const result = await commands.updateTag(id, name, color, getTodayDateString());
    handleSnapshotResult(result);
  };

  const handleDeleteTag = async (id: string) => {
    const result = await commands.deleteTag(id, getTodayDateString());
    handleSnapshotResult(result);
  };

  const getTodosForView = (view: ViewKey): Todo[] => {
    if (view === "stats") return [];
    if (isCorePartitionKey(view)) {
      return partitions()[view];
    }
    return [];
  };

  const searchTodos = async (query: string): Promise<SearchResultGroup[]> => {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const result = await commands.searchTodos(trimmed, getTodayDateString());
    if (result.status === "ok") {
      return normalizeSearchGroups(result.data);
    }

    console.error("后台搜索失败：", result.error);
    return [];
  };

  let notificationInFlight = false;
  const notifiedThisLaunch = new Set<string>();

  const handleUpdateReminder = async (id: string, reminderEnabled: boolean) => {
    const result = await commands.updateTodoReminder(
      id,
      reminderEnabled,
      getTodayDateString(),
    );
    if (handleSnapshotResult(result)) {
      if (!reminderEnabled) {
        notifiedThisLaunch.delete(id);
      } else {
        void runDueNotifications();
      }
    }
  };

  const runDueNotifications = async () => {
    if (!loaded() || notificationInFlight) return;

    notificationInFlight = true;
    const today = getTodayDateString();
    try {
      const remindersResult = await commands.getDueReminders(today);
      if (remindersResult.status === "error") {
        console.error("后台提醒检查失败：", remindersResult.error);
        return;
      }

      const pendingTodos: ReminderCandidate[] = remindersResult.data.filter(
        (todo) => !notifiedThisLaunch.has(todo.id),
      );
      if (pendingTodos.length === 0) return;

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
        handleSnapshotResult(result);
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
    searchTodos,
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
