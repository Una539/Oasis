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

import { createSignal, onMount } from "solid-js";

export type DeviceType = "mobile" | "desktop";

/**
 * 检测设备类型（移动端 vs 桌面端）。
 * 使用 CSS hover/pointer 媒体查询作为首要判断依据，
 * 回退到 user-agent 检测。
 */
export function useDeviceDetect(): () => DeviceType {
  const [deviceType, setDeviceType] = createSignal<DeviceType>("desktop");

  onMount(() => {
    const isDesktop = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;
    const isMobile = window.matchMedia(
      "(hover: none) and (pointer: coarse)",
    ).matches;

    if (isDesktop) {
      setDeviceType("desktop");
    } else if (isMobile) {
      setDeviceType("mobile");
    } else {
      // Fallback: user-agent
      const ua = navigator.userAgent.toLowerCase();
      if (
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(
          ua,
        )
      ) {
        setDeviceType("mobile");
      } else {
        setDeviceType("desktop");
      }
    }
  });

  return deviceType;
}
