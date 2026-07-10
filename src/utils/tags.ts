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

export const TAG_COLOR_PALETTE = [
  "#d97757",
  "#b88a2f",
  "#5c8a58",
  "#3c7a89",
  "#5f6f9f",
  "#9a6a8a",
  "#8a6b4c",
  "#6f7770",
] as const;

export function getPriorityColor(priority: number): string {
  const colors = ["#8fc5ff", "#a8dc9a", "#ffd66e", "#ffae7a", "#f58cab"];
  return colors[Math.min(Math.max(priority, 1), 5) - 1];
}
