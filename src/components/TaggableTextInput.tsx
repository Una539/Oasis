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

import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import {
  commands,
  type AppState as GeneratedAppState,
  type TagInputAnalysis,
  type TagSuggestion,
  type TagSuggestionAction,
} from "../bindings";
import { type Tag } from "../hooks/useTodos";

interface TaggableTextInputProps {
  value: string;
  tags: Tag[];
  selectedTagIds: string[];
  tagPlacement?: "inline" | "below";
  done?: boolean;
  placeholder?: string;
  inputClass?: string;
  onValueChange: (value: string) => void;
  onCommit?: (value: string) => void | Promise<void>;
  onTagIdsChange: (tagIds: string[]) => void | Promise<void>;
  onAppStateChange: (state: GeneratedAppState) => void;
}

const EMPTY_ANALYSIS: TagInputAnalysis = {
  active_mention: null,
  suggestions: [],
};

export default function TaggableTextInput(props: TaggableTextInputProps) {
  const [draft, setDraft] = createSignal(props.value);
  const [analysis, setAnalysis] = createSignal<TagInputAnalysis>(EMPTY_ANALYSIS);
  const [activeIndex, setActiveIndex] = createSignal(0);

  let inputRef: HTMLInputElement | undefined;
  let blurTimer: ReturnType<typeof setTimeout> | undefined;
  let analysisRequest = 0;

  createEffect(() => {
    setDraft(props.value);
  });

  const selectedTags = createMemo(() =>
    props.tags.filter((tag) => props.selectedTagIds.includes(tag.id)),
  );

  const suggestions = createMemo(() => analysis().suggestions);

  const updateAnalysis = async (
    value = inputRef?.value,
    caret = inputRef?.selectionStart ?? 0,
  ) => {
    if (value === undefined) return;

    const request = ++analysisRequest;
    const result = await commands.analyzeTagInput(value, caret, props.selectedTagIds);
    if (request !== analysisRequest) return;

    if (result.status === "ok") {
      setAnalysis(result.data);
      setActiveIndex(0);
    } else {
      console.error("标签输入分析失败：", result.error);
      setAnalysis(EMPTY_ANALYSIS);
    }
  };

  const updateAnalysisFromInput = () => {
    void updateAnalysis();
  };

  const setValue = (value: string) => {
    setDraft(value);
    props.onValueChange(value);
  };

  const selectSuggestion = async (suggestion: TagSuggestion) => {
    const currentMention = analysis().active_mention;
    if (!currentMention) return;

    const action: TagSuggestionAction = {
      kind: suggestion.kind,
      name: suggestion.name,
      tag_id: suggestion.tag?.id ?? null,
    };

    const result = await commands.applyTagSuggestion(
      draft(),
      props.selectedTagIds,
      currentMention.start,
      currentMention.end,
      action,
    );

    if (result.status === "error") {
      console.error("应用标签候选失败：", result.error);
      return;
    }

    props.onAppStateChange(result.data.app_state);
    setValue(result.data.value);
    setAnalysis(EMPTY_ANALYSIS);
    await props.onTagIdsChange(result.data.tag_ids);

    requestAnimationFrame(() => {
      inputRef?.focus();
      inputRef?.setSelectionRange(result.data.caret, result.data.caret);
    });
  };

  const removeTag = (tagId: string) => {
    void props.onTagIdsChange(props.selectedTagIds.filter((id) => id !== tagId));
  };

  const commit = () => {
    const nextValue = draft().trim();
    setValue(nextValue);
    void props.onCommit?.(nextValue);
  };

  const handleInput = (event: InputEvent & { currentTarget: HTMLInputElement }) => {
    const value = event.currentTarget.value;
    setValue(value);
    void updateAnalysis(value, event.currentTarget.selectionStart ?? value.length);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const items = suggestions();
    if (!analysis().active_mention || items.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((activeIndex() + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((activeIndex() - 1 + items.length) % items.length);
    } else if (event.key === "Tab") {
      event.preventDefault();
      void selectSuggestion(items[activeIndex()]);
    } else if (event.key === "Enter") {
      event.preventDefault();
      void selectSuggestion(items[activeIndex()]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setAnalysis(EMPTY_ANALYSIS);
    }
  };

  return (
    <div
      class={
        props.tagPlacement === "below"
          ? "taggable-input-shell tags-below"
          : "taggable-input-shell"
      }
    >
      <div class="taggable-input-main">
        <input
          ref={inputRef}
          type="text"
          class={`${props.inputClass ?? "todo-text-input"} ${props.done ? "done" : ""}`}
          value={draft()}
          placeholder={props.placeholder}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onKeyUp={updateAnalysisFromInput}
          onClick={updateAnalysisFromInput}
          onFocus={updateAnalysisFromInput}
          onBlur={() => {
            blurTimer = setTimeout(() => {
              setAnalysis(EMPTY_ANALYSIS);
              commit();
            }, 120);
          }}
        />
      </div>

      <Show when={selectedTags().length > 0}>
        <div class="selected-tag-row">
          <For each={selectedTags()}>
            {(tag) => (
              <button
                type="button"
                class="selected-tag-pill"
                style={{ "--tag-color": tag.color }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => removeTag(tag.id)}
                title={`移除标签 ${tag.name}`}
              >
                @{tag.name}
              </button>
            )}
          </For>
        </div>
      </Show>

      <Show when={analysis().active_mention && suggestions().length > 0}>
        <div class="tag-suggestion-popover">
          <For each={suggestions()}>
            {(suggestion, index) => (
              <button
                type="button"
                class={
                  activeIndex() === index()
                    ? "tag-suggestion-item active"
                    : "tag-suggestion-item"
                }
                style={{ "--tag-color": suggestion.tag?.color ?? "#6f7770" }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  if (blurTimer) clearTimeout(blurTimer);
                }}
                onClick={() => void selectSuggestion(suggestion)}
              >
                <span>
                  {suggestion.kind === "create" ? "创建 " : ""}@{suggestion.name}
                </span>
                <small>{suggestion.kind === "create" ? "Enter" : "Tab"}</small>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
