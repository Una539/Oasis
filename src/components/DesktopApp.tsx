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

import { createMemo, createSignal, For, onCleanup, onMount } from "solid-js";
import { type PartitionKey, type Partitions } from "../hooks/useTodos";
import TodoInput from "./TodoInput";
import DesktopTodoItem from "./DesktopTodoItem";

// ==================== 常量定义 ====================
// 分区 key 列表，用于遍历渲染侧边栏按钮
const PARTITION_KEYS: PartitionKey[] = [
  "today",
  "upcoming",
  "inbox",
  "outdated",
  "archived",
];

// 分区 key 对应的中文显示名称
const PARTITION_LABELS: Record<PartitionKey, string> = {
  today: "今天",
  upcoming: "未来",
  inbox: "任意时间",
  outdated: "过期",
  archived: "已完成",
};

// 侧边栏宽度约束
const MIN_SIDEBAR_WIDTH = 120; // 最小宽度：120px（太窄显示不全）
const DEFAULT_SIDEBAR_WIDTH = 160; // 默认宽度：160px

// ==================== 组件 Props 接口 ====================
interface DesktopAppProps {
  // 分区后的待办事项数据 { today: [...], upcoming: [...], ... }
  partitions: Partitions;
  // 添加待办
  handleAdd: (content: string, dueDate: string | null) => Promise<boolean>;
  // 删除待办
  handleDelete: (id: string) => Promise<void>;
  // 切换待办完成状态
  handleToggle: (id: string) => Promise<void>;
  // 更新待办内容
  handleUpdate: (id: string, content: string) => Promise<void>;
}

// ==================== 主组件 ====================
export default function DesktopApp(props: DesktopAppProps) {
  // ---- 状态定义 ----

  // 当前选中的分区（默认显示"今天"分区）
  const [currentPartition, setCurrentPartition] =
    createSignal<PartitionKey>("today");

  // 用户拖拽设定的目标宽度（可能超过最大值，由 sidebarWidth 计算时限制）
  const [targetWidth, setTargetWidth] = createSignal(DEFAULT_SIDEBAR_WIDTH);

  // 窗口宽度，用于响应式计算
  const [windowWidth, setWindowWidth] = createSignal(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );

  // ---- 计算属性 ----
  // 实际侧边栏宽度：取用户设定值和响应式上限的最小值
  // 响应式上限 = 窗口宽度的 1/4（确保侧边栏不会太宽）
  // 同时确保不小于最小宽度
  const sidebarWidth = createMemo(() =>
    Math.min(targetWidth(), Math.max(windowWidth() / 4, MIN_SIDEBAR_WIDTH)),
  );

  // ---- 拖拽调整宽度 ----
  // 存储清理函数，用于组件卸载时移除监听
  let cleanupResize: (() => void) | null = null;

  /**
   * 拖拽开始处理函数
   * 记录鼠标按下时的初始位置和宽度
   */
  const handleResizeStart = (e: MouseEvent) => {
    e.preventDefault(); // 阻止默认行为（防止选中文本）

    // 1. 记录初始状态
    const startX = e.clientX; // 鼠标按下时的 X 坐标
    const startTarget = targetWidth(); // 鼠标按下时的目标宽度

    /**
     * 拖拽移动处理函数
     * 根据鼠标移动量计算新的目标宽度
     */
    const handleResizeMove = (e: MouseEvent) => {
      const delta = e.clientX - startX; // 鼠标移动了多少
      // 新宽度 = 初始宽度 + 移动量（基础限制：不能小于最小宽度）
      setTargetWidth(Math.max(startTarget + delta, MIN_SIDEBAR_WIDTH));
    };

    /**
     * 拖拽结束处理函数
     * 移除 document 上的监听
     */
    const handleResizeEnd = () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
      cleanupResize = null;
    };

    // 2. 绑定到 document（不在手柄元素上，以便鼠标快速移动时仍能跟踪）
    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);

    // 3. 保存清理函数
    cleanupResize = () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
    };
  };

  // ---- 窗口尺寸变化处理 ----
  // 用于更新 windowWidth，使侧边栏能响应窗口大小变化
  let resizeHandle: HTMLDivElement | undefined;

  const handleWindowResize = () => {
    setWindowWidth(window.innerWidth);
  };

  // ---- 生命周期 ----
  // 组件挂载时绑定事件监听
  onMount(() => {
    // 拖拽手柄的 mousedown 事件
    resizeHandle?.addEventListener("mousedown", handleResizeStart);
    // 窗口尺寸变化事件（用于响应式计算）
    window.addEventListener("resize", handleWindowResize);
  });

  // 组件卸载时清理所有监听，防止内存泄漏
  onCleanup(() => {
    cleanupResize?.();
    resizeHandle?.removeEventListener("mousedown", handleResizeStart);
    window.removeEventListener("resize", handleWindowResize);
  });

  // ---- 计算属性 ----
  // 根据当前分区获取对应的待办列表
  const currentTodos = () => {
    return props.partitions[currentPartition()];
  };

  // ==================== 渲染 ====================
  return (
    <main flex h-full bg-bg overflow-hidden select-none>
      {/* 侧边栏导航 */}
      <nav
        style={{ width: `${sidebarWidth()}px` }} // 动态宽度（px 单位）
        bg-surface // 背景色
        border-r border-border // 右边框分隔线
        pt-4 px-3 // 内边距
        flex flex-col gap-1 // 垂直排列
        flex-shrink-0 // 不允许收缩
      >
        {/* 遍历渲染分区按钮 */}
        <For each={PARTITION_KEYS}>
          {(key) => (
            <button
              onClick={() => setCurrentPartition(key)} // 点击切换分区
              class={
                currentPartition() === key
                  ? "selected-item" // 选中样式
                  : "unselected-item" // 未选中样式
              }
            >
              {/* 分区名称 + 数量 */}
              <span>{PARTITION_LABELS[key]}</span>
              <span>{props.partitions[key].length}</span>
            </button>
          )}
        </For>
      </nav>

      {/* 拖拽调整手柄 */}
      <div
        ref={resizeHandle} // 获取 DOM 引用，用于绑定事件
        class="resize-handle" // CSS 类名（样式在 main.css 中定义）
        w-2 // 宽度 2 单位（8px）
        cursor-col-resize // 鼠标显示双向箭头
        transition-colors duration-150 // 过渡动画
        flex-shrink-0 // 不允许收缩
      />

      {/* 内容区域 */}
      <div flex-1 px-5 pt-6 pb-5 flex flex-col gap-3 h-full box-border>
        {/* 添加待办输入框 */}
        <TodoInput onAdd={props.handleAdd} />

        {/* 待办列表（可滚动） */}
        <div flex-1 overflow-y-auto overflow-x-hidden pr-1>
          <For each={currentTodos()}>
            {(todo) => (
              <DesktopTodoItem
                todo={todo}
                onToggle={props.handleToggle}
                onDelete={props.handleDelete}
                onUpdate={props.handleUpdate}
              />
            )}
          </For>
        </div>
      </div>
    </main>
  );
}