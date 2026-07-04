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

import { DateInput, type DateInputValueChangeDetails } from "@ark-ui/solid/date-input";
import { parseDate, type DateValue } from "@internationalized/date";
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

function toDateValue(value: string): DateValue[] {
  try {
    return value ? [parseDate(value)] : [];
  } catch {
    return [];
  }
}

function toDateString(value: DateValue | undefined): string | null {
  return value ? value.toString() : null;
}

export default function DueDateChip(props: DueDateChipProps) {
  const [draftValue, setDraftValue] = createSignal<DateValue[]>(toDateValue(props.value));
  const showValue = () => props.showValue ?? true;
  let lastOpen = false;

  createEffect(() => {
    if (props.open && !lastOpen) {
      setDraftValue(toDateValue(props.value || getTodayDateString()));
    }
    lastOpen = props.open;
  });

  const commitValue = (value = toDateString(draftValue()[0])) => {
    if (!value) return;
    props.onValueChange(value);
  };

  const commitAndClose = () => {
    commitValue();
    props.onOpenChange(false);
  };

  const handleValueChange = (details: DateInputValueChangeDetails) => {
    setDraftValue(details.value);

    const value = toDateString(details.value[0]);
    if (value) {
      props.onValueChange(value);
    }
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
      <DateInput.Root
        class="date-chip-editor"
        value={draftValue()}
        onValueChange={handleValueChange}
        granularity="day"
        locale="zh-CN"
        onFocusOut={(e) => {
          const next = e.relatedTarget as Node | null;
          if (!e.currentTarget.contains(next)) {
            commitAndClose();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitAndClose();
          }
        }}
      >
        <DateInput.Control class="date-chip-fields">
          <DateInput.SegmentGroup class="date-chip-segment-group">
            <DateInput.SegmentContext>
              {(segment) => <DateInput.Segment class="date-chip-segment" segment={segment} />}
            </DateInput.SegmentContext>
          </DateInput.SegmentGroup>
        </DateInput.Control>
        <DateInput.HiddenInput />
        <button
          type="button"
          class="date-chip-clear"
          onClick={() => {
            props.onClear();
            props.onOpenChange(false);
          }}
          aria-label="清除日期"
          title="清除日期"
        >
          <X size={12} />
        </button>
      </DateInput.Root>
    </Show>
  );
}
