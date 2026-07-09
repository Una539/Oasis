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

import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";
import { createEffect } from "solid-js";
import type { DeviceType } from "./useDeviceDetect";

export function useNotificationPermission(
  deviceType: () => DeviceType,
  onPermissionReady?: () => void | Promise<void>,
) {
  let permissionRequestedThisLaunch = false;

  createEffect(() => {
    if (deviceType() !== "mobile" || permissionRequestedThisLaunch) return;

    permissionRequestedThisLaunch = true;
    void requestNotificationPermission(onPermissionReady);
  });
}

async function requestNotificationPermission(
  onPermissionReady?: () => void | Promise<void>,
) {
  try {
    if (await isPermissionGranted()) {
      await onPermissionReady?.();
      return;
    }

    const permission = await requestPermission();
    if (permission === "granted") {
      await onPermissionReady?.();
    }
  } catch (error) {
    console.error("请求通知权限失败：", error);
  }
}
