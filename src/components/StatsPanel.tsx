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

import { For } from "solid-js";
import { type TodoStats } from "../hooks/useTodos";

interface StatsPanelProps {
  stats: TodoStats;
}

export default function StatsPanel(props: StatsPanelProps) {
  const maxCount = () =>
    Math.max(1, ...props.stats.trend.map((day) => day.count));

  return (
    <section class="stats-panel">
      <div class="stats-hero">
        <p>Oasis Pulse</p>
        <h1>完成节奏，而不是任务噪音。</h1>
      </div>

      <div class="stats-card-grid">
        <article class="stats-card">
          <span>本周完成</span>
          <strong>{props.stats.weekCompletedCount}</strong>
          <small>从本周一开始累计</small>
        </article>
        <article class="stats-card accent">
          <span>连续完成</span>
          <strong>{props.stats.streakDays}</strong>
          <small>每天至少完成 1 个任务</small>
        </article>
      </div>

      <article class="trend-card">
        <header>
          <span>7 天趋势</span>
          <small>最近一周完成数</small>
        </header>
        <div class="trend-bars">
          <For each={props.stats.trend}>
            {(day) => (
              <div class="trend-day">
                <div
                  class="trend-bar"
                  style={{ height: `${Math.max(10, (day.count / maxCount()) * 100)}%` }}
                  title={`${day.date}: ${day.count}`}
                >
                  <span>{day.count}</span>
                </div>
                <small>{day.label}</small>
              </div>
            )}
          </For>
        </div>
      </article>
    </section>
  );
}
