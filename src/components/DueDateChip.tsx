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

import { createEffect, createSignal, Show } from "solid-js";
import { CalendarClock, X } from "lucide-solid";
import { getTodayDateString } from "../utils/date";

interface DueDateChipProps {
  open: boolean;
  value: string;
  onOpenChange: (open: boolean) => void;
  onValueChange: (value: string) => void;
  onClear: () => void;
  triggerClass: string;
  triggerLabel: string;
  triggerTitle: string;
  showValue?: boolean;
}

interface ParsedDate {
  year: string;
  month: string;
  day: string;
}

function parseDate(value: string): ParsedDate {
  const fallback = getTodayDateString().split("-");
  const parts = (value || getTodayDateString()).split("-");
  const [year = fallback[0], month = fallback[1], day = fallback[2]] = parts;
  return { year, month, day };
}

function toDateString(parts: ParsedDate): string | null {
  if (parts.year.length !== 4 || parts.month.length !== 2 || parts.day.length !== 2) {
    return null;
  }

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function cleanDatePart(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function focusInput(input: HTMLInputElement | undefined | null) {
  input?.focus();
  input?.setSelectionRange?.(input.value.length, input.value.length);
}

export default function DueDateChip(props: DueDateChipProps) {
  const [draft, setDraft] = createSignal<ParsedDate>(parseDate(props.value));
  const showValue = () => props.showValue ?? true;
  let lastOpen = false;
  let yearRef: HTMLInputElement | undefined;
  let monthRef: HTMLInputElement | undefined;
  let dayRef: HTMLInputElement | undefined;

  createEffect(() => {
    if (props.open && !lastOpen) {
      setDraft(parseDate(props.value));
      queueMicrotask(() => focusInput(yearRef));
    }
    lastOpen = props.open;
  });

  const commitIfComplete = () => {
    const value = toDateString(draft());
    if (!value) return;
    props.onValueChange(value);
    props.onOpenChange(false);
  };

  const handleInput =
    (
      key: keyof ParsedDate,
      maxLength: number,
      next?: HTMLInputElement,
    ) =>
    (event: InputEvent) => {
      const target = event.currentTarget as HTMLInputElement;
      const value = cleanDatePart(target.value, maxLength);
      target.value = value;
      setDraft((current) => ({ ...current, [key]: value }));

      if (value.length === maxLength) {
        focusInput(next);
      }
    };

  const handleKeyDown =
    (previous?: HTMLInputElement) =>
    (event: KeyboardEvent) => {
      const target = event.currentTarget as HTMLInputElement;

      if (event.key === "Enter") {
        event.preventDefault();
        commitIfComplete();
        return;
      }

      if (event.key === "Backspace" && !target.value && previous) {
        event.preventDefault();
        focusInput(previous);
      }
  };

  const clearAndClose = () => {
    props.onClear();
    props.onOpenChange(false);
  };

  return (
    <Show
      when={props.open}
      fallback={
        showValue() ? (
          <div
            role="button"
            tabindex="0"
            class={`${props.triggerClass} date-chip-trigger`}
            aria-label={props.triggerLabel}
            title={props.triggerTitle}
            aria-pressed={false}
            onClick={() => props.onOpenChange(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                props.onOpenChange(true);
              }
            }}
          >
            <CalendarClock size={14} />
            <span class="date-chip-text">{props.value || props.triggerLabel}</span>
            <button
              type="button"
              class="date-chip-clear"
              onClick={(e) => {
                e.stopPropagation();
                props.onClear();
              }}
              aria-label="清除日期"
              title="清除日期"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            class={props.triggerClass}
            aria-label={props.triggerLabel}
            title={props.triggerTitle}
            onClick={() => props.onOpenChange(true)}
          >
            <CalendarClock size={17} />
          </button>
        )
      }
    >
      <div
        class="date-chip-editor"
        onFocusOut={(e) => {
          const next = e.relatedTarget as Node | null;
          if (!e.currentTarget.contains(next)) {
            commitIfComplete();
          }
        }}
      >
        <div class="date-chip-fields">
          <input
            ref={yearRef}
            type="text"
            inputMode="numeric"
            autocomplete="off"
            spellcheck="false"
            class="date-chip-segment year"
            value={draft().year}
            onInput={handleInput("year", 4, monthRef)}
            onKeyDown={handleKeyDown()}
            aria-label="年份"
            placeholder="年"
            maxLength={4}
          />
          <span class="date-chip-separator">/</span>
          <input
            ref={monthRef}
            type="text"
            inputMode="numeric"
            autocomplete="off"
            spellcheck="false"
            class="date-chip-segment short"
            value={draft().month}
            onInput={handleInput("month", 2, dayRef)}
            onKeyDown={handleKeyDown(yearRef)}
            aria-label="月份"
            placeholder="月"
            maxLength={2}
          />
          <span class="date-chip-separator">/</span>
          <input
            ref={dayRef}
            type="text"
            inputMode="numeric"
            autocomplete="off"
            spellcheck="false"
            class="date-chip-segment short"
            value={draft().day}
            onInput={handleInput("day", 2)}
            onKeyDown={handleKeyDown(monthRef)}
            aria-label="日期"
            placeholder="日"
            maxLength={2}
          />
        </div>
        <button
          type="button"
          class="date-chip-clear"
          onClick={clearAndClose}
          aria-label="清除日期"
          title="清除日期"
        >
          <X size={12} />
        </button>
      </div>
    </Show>
  );
}
