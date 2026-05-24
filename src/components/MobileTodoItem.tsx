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
import { type Todo } from "../hooks/useTodos";

const DELETE_THRESHOLD = 120;

type SwipeState = "idle" | "dragging" | "snapping" | "slide-out" | "deleting";

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
    let cls = "swipe-track flex items-center bg-surface rounded-mobile border border-solid border-surface relative z-1";
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
}

export default function MobileTodoItem(props: MobileTodoItemProps) {
  const { offset, trackClass, onTouchStart, onTouchMove, onTouchEnd } =
    createSwipeToDelete(() => props.onDelete(props.todo.id));

  return (
    <div relative mb="2.5" rounded-mobile overflow-hidden>
      {/* Red delete background */}
      <div
        class="delete-bg absolute inset-0 flex items-center justify-end pr-6 text-white text-[15px] font-semibold tracking-wider rounded-mobile pointer-events-none select-none"
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
      </div>
    </div>
  );
}
