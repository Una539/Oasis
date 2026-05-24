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

import { createSignal, For, Show, createMemo } from "solid-js";
import { ChevronLeft, ChevronRight, X } from "lucide-solid";

interface InlineDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function parseDate(str: string): { year: number; month: number; day: number } | null {
  if (!str) return null;
  const parts = str.split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return { year: y, month: m - 1, day: d };
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isToday(year: number, month: number, day: number): boolean {
  const today = new Date();
  return (
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day
  );
}

function isSameDate(
  year: number,
  month: number,
  day: number,
  selected: string,
): boolean {
  const parsed = parseDate(selected);
  if (!parsed) return false;
  return parsed.year === year && parsed.month === month && parsed.day === day;
}

export default function InlineDatePicker(props: InlineDatePickerProps) {
  const selected = createMemo(() => parseDate(props.value));

  const [viewYear, setViewYear] = createSignal(selected()?.year ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = createSignal(selected()?.month ?? new Date().getMonth());

  const daysInMonth = createMemo(() => getDaysInMonth(viewYear(), viewMonth()));
  const firstDayOfWeek = createMemo(() => getFirstDayOfMonth(viewYear(), viewMonth()));

  const calendarDays = createMemo(() => {
    const days: Array<{ day: number; month: number; year: number; isCurrentMonth: boolean }> = [];

    // Previous month padding
    const prevMonthDays = getDaysInMonth(viewYear(), viewMonth() - 1);
    for (let i = firstDayOfWeek() - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        month: viewMonth() - 1,
        year: viewMonth() === 0 ? viewYear() - 1 : viewYear(),
        isCurrentMonth: false,
      });
    }

    // Current month
    for (let i = 1; i <= daysInMonth(); i++) {
      days.push({
        day: i,
        month: viewMonth(),
        year: viewYear(),
        isCurrentMonth: true,
      });
    }

    // Next month padding (fill to 42 cells = 6 weeks)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        month: viewMonth() + 1,
        year: viewMonth() === 11 ? viewYear() + 1 : viewYear(),
        isCurrentMonth: false,
      });
    }

    return days;
  });

  const handlePrevMonth = () => {
    if (viewMonth() === 0) {
      setViewMonth(11);
      setViewYear(viewYear() - 1);
    } else {
      setViewMonth(viewMonth() - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth() === 11) {
      setViewMonth(0);
      setViewYear(viewYear() + 1);
    } else {
      setViewMonth(viewMonth() + 1);
    }
  };

  const handleSelect = (year: number, month: number, day: number) => {
    props.onChange(formatDate(year, month, day));
  };

  const monthLabel = createMemo(() => {
    return `${viewYear()}年${viewMonth() + 1}月`;
  });

  return (
    <div class="inline-date-picker bg-surface border border-border p-2 flex flex-col gap-1 shadow-md">
      {/* Header */}
      <div class="flex items-center justify-between px-1">
        <button
          type="button"
          class="flex items-center justify-center w-7 h-7 border-none bg-transparent color-text cursor-pointer rounded-md transition-all duration-150 hover:bg-surface-hover active:scale-92"
          onClick={handlePrevMonth}
          aria-label="上个月"
        >
          <ChevronLeft size={16} />
        </button>
        <span class="text-[14px] font-semibold color-text select-none">
          {monthLabel()}
        </span>
        <button
          type="button"
          class="flex items-center justify-center w-7 h-7 border-none bg-transparent color-text cursor-pointer rounded-md transition-all duration-150 hover:bg-surface-hover active:scale-92"
          onClick={handleNextMonth}
          aria-label="下个月"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekday headers */}
      <div class="grid grid-cols-7 gap-0.5 px-1">
        <For each={WEEKDAYS}>
          {(day) => (
            <span class="text-center text-[11px] font-medium color-text-muted py-1 select-none">
              {day}
            </span>
          )}
        </For>
      </div>

      {/* Calendar grid */}
      <div class="grid grid-cols-7 gap-0.5 px-1">
        <For each={calendarDays()}>
          {(item) => {
            const isSelected = isSameDate(item.year, item.month, item.day, props.value);
            const today = isToday(item.year, item.month, item.day);
            return (
              <button
                type="button"
                class="flex items-center justify-center aspect-square border-none bg-transparent color-text text-[13px] cursor-pointer rounded-md transition-all duration-150 select-none relative hover:bg-surface-hover active:scale-92"
                classList={{
                  "color-text-muted opacity-50": !item.isCurrentMonth,
                  "font-semibold": today,
                  "!bg-text color-bg font-semibold": isSelected,
                }}
                onClick={() => handleSelect(item.year, item.month, item.day)}
              >
                {item.day}
                {today && !isSelected && (
                  <span class="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-text-secondary" />
                )}
              </button>
            );
          }}
        </For>
      </div>

      {/* Footer */}
      <Show when={props.value}>
        <div class="flex items-center justify-between px-1 pt-1.5 pb-0.5 border-t border-border">
          <span class="text-[12px] color-text-secondary">
            已选：{props.value}
          </span>
          <button
            type="button"
            class="flex items-center gap-1 border-none bg-transparent color-text-muted text-[12px] cursor-pointer px-1.5 py-0.5 rounded transition-all duration-150 hover:color-text hover:bg-surface-hover"
            onClick={props.onClear}
            aria-label="清除日期"
          >
            <X size={12} />
            <span>清除</span>
          </button>
        </div>
      </Show>
    </div>
  );
}
