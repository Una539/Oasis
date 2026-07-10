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

import { createEffect, createSignal, createMemo, onCleanup } from "solid-js";
import { type Todo } from "../hooks/useTodos";
import { getTodayDateString } from "../utils/date";
import { getPriorityColor } from "../utils/tags";
import DueDateChip from "./DueDateChip";
import TodoMetaControls from "./TodoMetaControls";

const DELETE_THRESHOLD = 120;
const DATE_EDIT_LONG_PRESS_MS = 520;
const TODO_EDIT_LONG_PRESS_MS = 520;

type SwipeState = "idle" | "dragging" | "snapping" | "slide-out" | "deleting";
type DateKind = "planned" | "due";

interface SwipeResult {
  offset: () => number;
  trackClass: () => string;
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: () => void;
}

function createSwipeToDelete(onDelete: () => void): SwipeResult {
  const [offset, setOffset] = createSignal(0);
  const [swipeState, setSwipeState] = createSignal<SwipeState>("idle");

  let startX = 0;
  let startY = 0;
  let tracking = false;

  const onTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    tracking = true;
    setSwipeState("dragging");
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!tracking) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      tracking = false;
      setOffset(0);
      setSwipeState("idle");
      return;
    }

    if (dx < 0) {
      e.preventDefault();
      setOffset(dx);
    }
  };

  let deleteTimer: ReturnType<typeof setTimeout> | undefined;
  let snapTimer: ReturnType<typeof setTimeout> | undefined;

  onCleanup(() => {
    if (deleteTimer) clearTimeout(deleteTimer);
    if (snapTimer) clearTimeout(snapTimer);
  });

  const onTouchEnd = () => {
    if (!tracking) return;
    tracking = false;
    const currentOffset = offset();

    if (currentOffset <= -DELETE_THRESHOLD) {
      setSwipeState("slide-out");
      setOffset(-window.innerWidth);
      deleteTimer = setTimeout(() => {
        setSwipeState("deleting");
        onDelete();
      }, 250);
    } else {
      setSwipeState("snapping");
      setOffset(0);
      snapTimer = setTimeout(() => setSwipeState("idle"), 300);
    }
  };

  const trackClass = createMemo(() => {
    const state = swipeState();
    let cls = "swipe-track mobile-todo-track bg-surface todo-card-radius border border-solid border-surface relative z-1";
    if (state === "snapping") cls += " snapping-back";
    if (state === "slide-out") cls += " slide-out";
    if (state === "deleting") cls += " deleting";
    return cls;
  });

  return {
    offset,
    trackClass,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}

interface MobileTodoItemProps {
  todo: Todo;
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, content: string) => Promise<void>;
  onUpdatePlannedDate: (id: string, plannedDate: string | null) => Promise<void>;
  onUpdateDueDate: (id: string, dueDate: string | null) => Promise<void>;
  onUpdatePriority: (id: string, priority: number) => Promise<void>;
  onUpdateReminder: (id: string, reminderEnabled: boolean) => Promise<void>;
}

export default function MobileTodoItem(props: MobileTodoItemProps) {
  const { offset, trackClass, onTouchStart, onTouchMove, onTouchEnd } =
    createSwipeToDelete(() => props.onDelete(props.todo.id));
  const [draftContent, setDraftContent] = createSignal(props.todo.content);
  const [editingContent, setEditingContent] = createSignal(false);
  const [datePickerOpen, setDatePickerOpen] = createSignal(false);
  const [draftDate, setDraftDate] = createSignal("");
  const [editingDateKind, setEditingDateKind] = createSignal<DateKind | null>(null);
  let dateEditTimer: ReturnType<typeof setTimeout> | undefined;
  let suppressNextDateToggle = false;
  let editTimer: ReturnType<typeof setTimeout> | undefined;
  let suppressNextToggle = false;
  let contentInput: HTMLInputElement | undefined;

  onCleanup(() => {
    if (dateEditTimer) clearTimeout(dateEditTimer);
    if (editTimer) clearTimeout(editTimer);
  });

  createEffect(() => {
    setDraftContent(props.todo.content);
  });

  createEffect(() => {
    if (editingContent()) {
      queueMicrotask(() => contentInput?.focus());
    }
  });

  const commitContent = async () => {
    const content = draftContent().trim();
    if (!content || content === props.todo.content) return;
    await props.onUpdate(props.todo.id, content);
  };

  const clearEditTimer = () => {
    if (editTimer) {
      clearTimeout(editTimer);
      editTimer = undefined;
    }
  };

  const startEditPress = () => {
    clearEditTimer();
    suppressNextToggle = false;
    editTimer = setTimeout(() => {
      suppressNextToggle = true;
      setEditingContent(true);
      editTimer = undefined;
    }, TODO_EDIT_LONG_PRESS_MS);
  };

  const toggleOrEdit = () => {
    if (suppressNextToggle) {
      suppressNextToggle = false;
      return;
    }
    void props.onToggle(props.todo.id);
  };

  const handleDateClear = async () => {
    if (editingDateKind() === "due" || (editingDateKind() === null && props.todo.due_date)) {
      await props.onUpdateDueDate(props.todo.id, null);
    } else {
      await props.onUpdatePlannedDate(props.todo.id, null);
    }
    setDatePickerOpen(false);
    setDraftDate("");
  };

  const handleOpenChange = (open: boolean) => {
    setDatePickerOpen(open);
    if (open) {
      const dateKind = editingDateKind();
      const currentDate =
        dateKind === "due"
          ? props.todo.due_date
          : dateKind === "planned"
            ? props.todo.planned_date
            : props.todo.due_date || props.todo.planned_date;
      setDraftDate(currentDate || getTodayDateString());
    } else {
      setDraftDate("");
      setEditingDateKind(null);
    }
  };

  const openDateEditor = (dateKind: DateKind) => {
    const currentDate =
      dateKind === "due" ? props.todo.due_date : props.todo.planned_date;
    setEditingDateKind(dateKind);
    setDraftDate(currentDate || getTodayDateString());
    setDatePickerOpen(true);
  };

  const handleDateChange = (value: string) => {
    setDraftDate(value);
    if (editingDateKind() === "due" || (editingDateKind() === null && props.todo.due_date)) {
      void props.onUpdateDueDate(props.todo.id, value || null);
    } else {
      void props.onUpdatePlannedDate(props.todo.id, value || null);
    }
  };

  const activeDateValue = () => {
    if (draftDate()) return draftDate();
    const dateKind = editingDateKind();
    if (dateKind === "due") return props.todo.due_date || "";
    if (dateKind === "planned") return props.todo.planned_date || "";
    return props.todo.due_date || props.todo.planned_date || "";
  };

  const clearDateEditTimer = () => {
    if (dateEditTimer) {
      clearTimeout(dateEditTimer);
      dateEditTimer = undefined;
    }
  };

  const startDateEditPress = (dateKind: DateKind) => {
    clearDateEditTimer();
    suppressNextDateToggle = false;
    dateEditTimer = setTimeout(() => {
      suppressNextDateToggle = true;
      openDateEditor(dateKind);
      dateEditTimer = undefined;
    }, DATE_EDIT_LONG_PRESS_MS);
  };

  const toggleReminder = async () => {
    if (suppressNextDateToggle) {
      suppressNextDateToggle = false;
      return;
    }
    await props.onUpdateReminder(props.todo.id, !props.todo.reminder_enabled);
  };

  const dueDateClass = () => {
    if (!props.todo.due_date) return "due-date-badge";
    const today = getTodayDateString();
    if (props.todo.due_date === today) return "due-date-badge today";
    if (!props.todo.done && props.todo.due_date < today) return "due-date-badge overdue";
    return "due-date-badge";
  };

  const dateBadgeClass = (baseClass: string) =>
    props.todo.reminder_enabled
      ? `${baseClass} mobile-editable reminder-on`
      : `${baseClass} mobile-editable`;

  const dateBadgeTitle = (dateKind: DateKind) => {
    const action = props.todo.reminder_enabled ? "关闭提醒" : "开启提醒";
    const editTarget = dateKind === "due" ? "截止日期" : "想做日期";
    return `${action}，长按修改${editTarget}`;
  };

  return (
    <div relative mb="3" class="todo-card-radius">
      {/* Red delete background */}
      <div
        class="delete-bg absolute inset-0 flex items-center justify-end pr-6 text-white text-[15px] font-semibold tracking-wider todo-card-radius pointer-events-none select-none"
      >
        删除
      </div>

      {/* Swipeable track */}
      <div
        class={trackClass()}
        style={{ transform: `translateX(${offset()}px)`, "touch-action": "pan-y" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          class="priority-stripe mobile"
          style={{ "--priority-color": getPriorityColor(props.todo.priority) }}
        />
        <div class="mobile-todo-body">
          <div class="mobile-todo-main-row">
            <input
              type="checkbox"
              class="todo-checkbox"
              checked={props.todo.done}
              onChange={() => props.onToggle(props.todo.id)}
            />
            {editingContent() ? (
              <input
                ref={contentInput}
                type="text"
                class={props.todo.done ? "todo-text-input done" : "todo-text-input"}
                value={draftContent()}
                onInput={(event) => setDraftContent(event.currentTarget.value)}
                onBlur={() => {
                  void commitContent();
                  setEditingContent(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                  if (event.key === "Escape") {
                    setDraftContent(props.todo.content);
                    event.currentTarget.blur();
                  }
                }}
              />
            ) : (
              <div
                class={props.todo.done ? "todo-content-trigger done" : "todo-content-trigger"}
                role="button"
                tabindex="0"
                onPointerDown={startEditPress}
                onPointerUp={clearEditTimer}
                onPointerLeave={clearEditTimer}
                onPointerCancel={clearEditTimer}
                onClick={toggleOrEdit}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleOrEdit();
                  }
                }}
                title="点击完成，长按修改"
              >
                {props.todo.content}
              </div>
            )}
          </div>
          <div class="mobile-todo-meta-row">
            <TodoMetaControls
              todo={props.todo}
              onUpdatePriority={props.onUpdatePriority}
              onUpdateReminder={props.onUpdateReminder}
              hideReminder
            />
            <div class="mobile-date-badges">
              {props.todo.planned_date && (
                <button
                  type="button"
                  class={dateBadgeClass("due-date-badge")}
                  text="[12px]"
                  whitespace-nowrap
                  flex-shrink-0
                  aria-pressed={props.todo.reminder_enabled}
                  onClick={() => void toggleReminder()}
                  onPointerDown={() => startDateEditPress("planned")}
                  onPointerUp={clearDateEditTimer}
                  onPointerLeave={clearDateEditTimer}
                  onPointerCancel={clearDateEditTimer}
                  onContextMenu={(event) => event.preventDefault()}
                  title={dateBadgeTitle("planned")}
                >
                  想 {props.todo.planned_date}
                </button>
              )}
              {props.todo.due_date && (
                <button
                  type="button"
                  class={dateBadgeClass(dueDateClass())}
                  text="[12px]"
                  whitespace-nowrap
                  flex-shrink-0
                  aria-pressed={props.todo.reminder_enabled}
                  onClick={() => void toggleReminder()}
                  onPointerDown={() => startDateEditPress("due")}
                  onPointerUp={clearDateEditTimer}
                  onPointerLeave={clearDateEditTimer}
                  onPointerCancel={clearDateEditTimer}
                  onContextMenu={(event) => event.preventDefault()}
                  title={dateBadgeTitle("due")}
                >
                  截 {props.todo.due_date}
                </button>
              )}
            </div>
          </div>
          <div class="mobile-date-editor-row">
            <DueDateChip
              open={datePickerOpen()}
              value={activeDateValue()}
              onOpenChange={handleOpenChange}
              onValueChange={handleDateChange}
              onClear={handleDateClear}
              triggerClass="todo-icon-button mobile"
              triggerLabel={props.todo.due_date ? "设置截止日期" : "设置想做日期"}
              triggerTitle={props.todo.due_date ? "截止日期" : "想做日期"}
              showValue={false}
              hideTrigger
            />
          </div>
        </div>
      </div>
    </div>
  );
}
