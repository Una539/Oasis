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

import { createSignal, createMemo, onCleanup } from "solid-js";
import { X } from "lucide-solid";
import { type Todo } from "../rsstore";
import "./TodoItem.css";

const DELETE_THRESHOLD = 120;

type SwipeState = "idle" | "dragging" | "snapping" | "slide-out" | "deleting";

interface SwipeResult {
  offset: () => number;
  trackClass: () => string;
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: () => void;
}

/**
 * 封装滑动删除手势逻辑。
 * 返回 offset signal、trackClass memo、以及三个触摸事件处理器。
 */
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
    let cls = "todo-item swipe-track";
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

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, content: string) => Promise<void>;
}

export default function TodoItem(props: TodoItemProps) {
  const { offset, trackClass, onTouchStart, onTouchMove, onTouchEnd } =
    createSwipeToDelete(() => props.onDelete(props.todo.id));

  return (
    <div class="todo-item-wrapper">
      <div class="delete-hint">删除</div>
      <div
        class={trackClass()}
        style={{ transform: `translateX(${offset()}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <input
          type="checkbox"
          checked={props.todo.done}
          onChange={() => props.onToggle(props.todo.id)}
        />
        <input
          type="text"
          class={props.todo.done ? "done" : ""}
          value={props.todo.content}
          onChange={(e) =>
            props.onUpdate(props.todo.id, e.currentTarget.value)
          }
        />
        {props.todo.due_date && (
          <span class="due-date">{props.todo.due_date}</span>
        )}
        <button
          class="delete-btn"
          onClick={() => props.onDelete(props.todo.id)}
          aria-label="删除这个待办"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
