# Oasis Flow 开发路线图 (Roadmap)

> **版本**: 0.3.0 → 按需增量演进  
> **最后更新**: 2026-05-24  
> **设计哲学**: _Focus First_ — 帮助用户专注于真正重要的事，而非记录更多。

---

## 目录

1. [核心原则](#1-核心原则)
2. [产品愿景](#2-产品愿景)
3. [用户痛点映射](#3-用户痛点映射)
4. [迭代总览](#4-迭代总览)
5. [迭代 #1：归档视图 + 智能分区](#迭代-1归档视图--智能分区)
6. [迭代 #2：优先级系统](#迭代-2优先级系统)
7. [迭代 #3：多标签系统](#迭代-3多标签系统)
8. [迭代 #4：截止日期增强 + 应用内提醒](#迭代-4截止日期增强--应用内提醒)
9. [迭代 #5：统计面板](#迭代-5统计面板)
10. [迭代 #6：系统通知](#迭代-6系统通知)
11. [迭代 #7：导出/导入迁移](#迭代-7导出导入迁移)
12. [设计规范](#12-设计规范)
13. [编码规范](#13-编码规范)
14. [数据模型增量演进规则](#14-数据模型增量演进规则)
15. [附录：参考与灵感](#15-附录参考与灵感)

---

## 1. 核心原则

### 按需增量（Just-in-Time Fields）

**绝不提前添加尚未使用的字段。** 每个迭代只引入该功能严格必需的数据模型字段和函数。代码中不存在 "为未来预留" 的 dead code。

### 零 Dead Code 承诺

- 新增字段必须在该迭代的前端或后端**至少有一处实际读写**
- 新增命令必须被前端实际调用，或作为必要的基础设施
- 向后兼容逻辑只在字段**实际出现**时编写，不预写

### 向后兼容契约

每次数据模型变更都静默迁移旧数据：检测缺失字段 → 填充合理默认值 → 用户无感知。

---

## 2. 产品愿景

### 一句话定义

> Oasis Flow 是一款**低焦虑、高专注**的跨平台待办管理工具，帮助用户自然地聚焦于"今天该做的事"。

### 核心差异

与 Todoist、Microsoft To Do 等工具不同，Oasis Flow 不追求"记录一切"，而是：

- **默认看"今天"** — 打开应用第一眼看到的是"今天"该做的事，而非堆积如山的全部任务
- **温和处理过期** — 过期任务不制造焦虑，而是提供"重新安排"的温和选项
- **完成有正向反馈** — 每一次勾选都有愉悦的微交互，强化使用动力
- **输入极简** — 支持自然语言快速输入，减少上下文切换成本

---

## 3. 用户痛点映射

| # | 痛点名称 | 用户原话 | Oasis Flow 解法 |
|---|---------|---------|----------------|
| 1 | **列表恐惧** | "一打开看到几十条任务，头都大了" | **默认"今天"视图**，打开只显示当天任务 |
| 2 | **输入焦虑** | "面对空输入框不知道写什么" | **空状态设计** + 快速建议文案 |
| 3 | **分类混乱** | "工作、生活、杂事全混在一起" | **多标签 + 颜色标记** + 分区视图 |
| 4 | **过期压力** | "过期的任务像欠债一样挂在上面" | **温和过期提示** + "重新安排"交互 |
| 5 | **完成无感** | "勾掉了也没什么感觉" | **完成微动效** + 触觉反馈 |
| 6 | **上下文切换** | "只是想记个事，却要在应用里操作半天" | **自然语言输入** + 托盘快速入口 |
| 7 | **通知噪音** | "提醒太多，最后全关了" | **温和通知策略**（仅推送一次，不重复轰炸） |
| 8 | **进度黑盒** | "我这一周到底干了什么？" | **极简统计面板**（周完成趋势） |
| 9 | **碎片陷阱** | "全是小事，重要的事被淹没" | **优先级视觉权重**（高优先级更"重"） |
| 10 | **数据不安** | "我的数据在哪？换电脑怎么办？" | **JSON 导出/导入** + 透明存储路径 |

---

## 4. 迭代总览

每个迭代都是**可独立交付的增量**，包含明确的数据模型变更范围。

```
迭代 #1  归档视图 + 智能分区       (v0.3.0)
  └── 新增字段: archived: bool
  └── 新命令: archive_todo
  └── 新组件: ViewTabs, EmptyState

迭代 #2  优先级系统                (v0.3.1)
  └── 新增字段: priority: u8
  └── 新命令: update_todo_priority
  └── 新组件: PriorityPicker, PriorityBar

迭代 #3  多标签系统                (v0.3.2)
  └── 新增结构: Tag { name, color }
  └── 新增字段: tags: Vec<Tag>
  └── 新命令: update_todo_tags
  └── 新组件: TagPicker, TagFilterBar, TagBadge
  └── 新文件: constants.ts (调色板)

迭代 #4  截止日期增强 + 应用内提醒   (v0.3.3)
  └── 新增字段: remind: bool
  └── 新命令: update_todo_remind
  └── 新组件: DueBadge
  └── 修改: TodoInput (提醒开关)

迭代 #5  统计面板                 (v0.3.4)
  └── 新增字段: created_at, completed_at
  └── 修改: add_todo, toggle_todo (自动设置时间戳)
  └── 新组件: StatsPanel
  └── 新文件: utils/stats.ts

迭代 #6  系统通知                 (v0.4.0)
  └── 复用字段: remind, due_date
  └── 新插件: tauri-plugin-notification
  └── 新模块: scheduler.rs (定时检查)

迭代 #7  导出/导入迁移             (v0.4.1)
  └── 无新字段
  └── 新命令: export_todos, import_todos
  └── 新组件: ExportImportButtons

迭代 #8  自然语言快速输入          (v0.5.0)
  └── 无新字段
  └── 新文件: utils/parseNaturalLanguage.ts
  └── 修改: TodoInput (解析逻辑)

迭代 #9  系统托盘快速输入           (v0.5.1)
  └── 无新字段
  └── 新模块: tray.rs
  └── 新窗口: quick-add (迷你浮窗)

迭代 #10 应用内快捷键              (v0.5.2)
  └── 无新字段
  └── 新文件: hooks/useKeyboardShortcuts.ts

迭代 #11 排序 & 筛选               (v0.5.3)
  └── 无新字段
  └── 新文件: hooks/useTodoSortFilter.ts
  └── 新组件: SortFilterBar

迭代 #12 拖拽排序                  (v1.0.0)
  └── 新增字段: order_index: u32
  └── 新命令: reorder_todos
  └── 修改: load_todos (按 order_index 排序)

迭代 #13 子任务 / Checklist        (v1.1.0)
  └── 新增结构: SubTask { id, content, done }
  └── 新增字段: subtasks: Vec<SubTask>
  └── 新命令: add_subtask, toggle_subtask, delete_subtask

迭代 #14 主题自定义                (v1.2.0)
  └── 新增字段: accent_color: String (用户设置)
  └── 新组件: ThemeSettings
```

---

## 迭代 #1：归档视图 + 智能分区

### 目标
将应用从"单一列表"改为"分区视图"，默认显示"今天"。已完成任务自动归档，不再占据主列表。

### 数据模型变更 (Rust)

`src-tauri/src/store.rs` 中 `Todo` 结构体新增字段：

```rust
pub struct Todo {
    pub id: String,
    pub content: String,
    pub done: bool,
    pub due_date: Option<String>,
    pub archived: bool,  // ← 本次新增，默认 false
}
```

**仅此一个字段。** 无其他字段引入。

### 向后兼容

在 `load_from_disk` 中处理旧数据（缺少 `archived` 字段）：

```rust
// 只在 archived 字段实际出现时才添加这段逻辑
for todo in todos.iter_mut() {
    if todo.id.is_empty() {
        todo.id = generate_id();
    }
    // 新增：本次迭代加入的向后兼容
    // serde 会自动处理 Option/默认值的缺失，但 bool 需要显式兜底
}
```

由于 `serde` 反序列化会忽略未知字段，而旧 JSON 中没有 `archived`，需要确保 `Todo` 对 `archived` 有默认值 `false`。最简单的方式是给 `Todo` 实现 `Default`，或手动在加载后遍历填充。

### 新增 Rust 命令

```rust
/// 归档或取消归档指定任务
#[tauri::command]
#[specta::specta]
pub async fn archive_todo(
    app: AppHandle,
    id: String,
    archived: bool,
) -> Result<Vec<Todo>, String>;
```

### 修改现有命令

`toggle_todo` 需要修改为：**当任务标记为完成时，自动归档**。

```rust
#[tauri::command]
#[specta::specta]
pub async fn toggle_todo(app: AppHandle, id: String) -> Result<Vec<Todo>, String> {
    let path = get_storage_path(&app)?;
    let mut todos = load_from_disk(&path)?;
    if let Some(todo) = todos.iter_mut().find(|t| t.id == id) {
        todo.done = !todo.done;
        // 自动归档逻辑：完成 → 归档；取消完成 → 取消归档
        todo.archived = todo.done;
    }
    save_to_disk(&path, &todos)?;
    Ok(todos)
}
```

### 前端变更

**新增组件**：
- `src/components/ViewTabs.tsx` — 顶部 Tab 切换（Today / Upcoming / Inbox / Archived）
- `src/components/EmptyState.tsx` — 分区空状态（鼓励文案 + 图标）

**新增 Hook**：
- `src/hooks/useTodoFilter.ts` — 封装分区过滤逻辑

**修改**：
- `App.tsx` — 添加 `activeSection` signal，引入 `ViewTabs`，按分区过滤渲染

### 分区规则

| 分区 | 显示条件 | 说明 |
|------|---------|------|
| **Today** | `!archived && !done && (due_date 为今天 或 已过期)` | 用户每天第一眼看到的 |
| **Upcoming** | `!archived && !done && due_date 为明天及以后` | 规划未来 |
| **Inbox** | `!archived && !done && due_date 为空` | 快速记录，暂不安排 |
| **Archived** | `done 或 archived` | 已完成/已归档 |

---

## 迭代 #2：优先级系统

### 目标
1-5 级优先级，通过视觉权重自然区分（左侧竖条宽度 + 颜色）。

### 数据模型变更 (Rust)

`Todo` 结构体新增字段：

```rust
pub struct Todo {
    pub id: String,
    pub content: String,
    pub done: bool,
    pub priority: u8,               // ← 本次新增，范围 1-5，默认 3
    pub due_date: Option<String>,
    pub archived: bool,
}
```

### 向后兼容

`load_from_disk` 中处理旧数据（缺少 `priority` 字段）：

```rust
// 遍历 todos，为缺失 priority 的项填充默认值 3
for todo in todos.iter_mut() {
    // ... 已有的 archived 兼容逻辑
    if todo.priority == 0 || /* 检测旧数据 */ {
        todo.priority = 3;
    }
}
```

### 新增 Rust 命令

```rust
/// 更新任务优先级
#[tauri::command]
#[specta::specta]
pub async fn update_todo_priority(
    app: AppHandle,
    id: String,
    priority: u8,
) -> Result<Vec<Todo>, String>;
```

### 前端变更

**新增组件**：
- `src/components/PriorityPicker.tsx` — 1-5 级优先级选择器
- `src/components/PriorityBar.tsx` — TodoItem 左侧竖条

**修改**：
- `TodoItem.tsx` — 左侧添加优先级竖条
- `TodoInput.tsx` — 添加优先级选择（可选，默认 3）

### 视觉规范

| 优先级 | 左侧竖条宽度 | 颜色 | 语义 |
|--------|------------|------|------|
| 5 (最高) | 6px | `#dc2626` | 紧急重要 |
| 4 | 4px | `#f97316` | 重要 |
| 3 (默认) | 3px | `#3b82f6` | 普通 |
| 2 | 2px | `#06b6d4` | 次要 |
| 1 (最低) | 1px | `#a9a29e` | 备忘 |

---

## 迭代 #3：多标签系统

### 目标
支持多标签（多对多），自由创建，预设调色板，按标签筛选。

### 数据模型变更 (Rust)

新增结构体和字段：

```rust
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Tag {
    pub name: String,
    pub color: String, // HEX, e.g. "#ef4444"
}

pub struct Todo {
    pub id: String,
    pub content: String,
    pub done: bool,
    pub priority: u8,
    pub tags: Vec<Tag>,            // ← 本次新增，默认空
    pub due_date: Option<String>,
    pub archived: bool,
}
```

### 向后兼容

`load_from_disk` 中处理旧数据（缺少 `tags` 字段）：

```rust
for todo in todos.iter_mut() {
    // ... 已有的兼容逻辑
    if /* 检测旧数据缺少 tags */ {
        todo.tags = vec![];
    }
}
```

### 新增 Rust 命令

```rust
/// 更新任务标签
#[tauri::command]
#[specta::specta]
pub async fn update_todo_tags(
    app: AppHandle,
    id: String,
    tags: Vec<Tag>,
) -> Result<Vec<Todo>, String>;
```

### 前端变更

**新增组件**：
- `src/components/TagPicker.tsx` — 标签选择/创建/调色板
- `src/components/TagFilterBar.tsx` — 顶部标签筛选栏
- `src/components/TagBadge.tsx` — 单个标签色块

**新增文件**：
- `src/constants.ts` — 预设调色板常量

**修改**：
- `TodoItem.tsx` — 内容下方显示标签 badge
- `TodoInput.tsx` — 添加标签选择

### 调色板 (12 色)

```typescript
export const TAG_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16",
  "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6",
  "#d946ef", "#f43f5e", "#78716c", "#1c1917",
];
```

---

## 迭代 #4：截止日期增强 + 应用内提醒

### 目标
为截止日期添加应用内视觉提醒（逾期高亮、今日 badge），每个任务可单独开启/关闭系统提醒（字段先到位，系统通知在迭代 #6 实现）。

### 数据模型变更 (Rust)

`Todo` 结构体新增字段：

```rust
pub struct Todo {
    pub id: String,
    pub content: String,
    pub done: bool,
    pub priority: u8,
    pub tags: Vec<Tag>,
    pub due_date: Option<String>,
    pub remind: bool,              // ← 本次新增，默认 false
    pub archived: bool,
}
```

### 向后兼容

`load_from_disk` 中处理旧数据（缺少 `remind` 字段）：

```rust
for todo in todos.iter_mut() {
    // ... 已有的兼容逻辑
    if /* 检测旧数据缺少 remind */ {
        todo.remind = false;
    }
}
```

### 新增 Rust 命令

```rust
/// 更新任务提醒开关
#[tauri::command]
#[specta::specta]
pub async fn update_todo_remind(
    app: AppHandle,
    id: String,
    remind: bool,
) -> Result<Vec<Todo>, String>;
```

### 前端变更

**新增组件**：
- `src/components/DueBadge.tsx` — 逾期/今日/未来日期标识
- `src/components/ReschedulePopover.tsx` — "重新安排"弹窗（今天/明天/下周/清除）

**修改**：
- `TodoItem.tsx` — 显示 DueBadge，过期任务用琥珀色而非红色
- `TodoInput.tsx` — 日期选择器旁添加提醒开关（默认关闭）

### 应用内提醒规则

- **逾期**：左侧竖条变为琥珀色 `#f59e0b`，文案"已过期 — 重新安排"
- **今日到期**：显示"今天"badge
- **未来**：正常显示日期

---

## 迭代 #5：统计面板

### 目标
极简统计面板：本周完成数、连续使用天数、7 天完成趋势图。

### 数据模型变更 (Rust)

`Todo` 结构体新增字段：

```rust
pub struct Todo {
    pub id: String,
    pub content: String,
    pub done: bool,
    pub priority: u8,
    pub tags: Vec<Tag>,
    pub due_date: Option<String>,
    pub remind: bool,
    pub archived: bool,
    pub created_at: String,          // ← 本次新增，ISO 8601 datetime
    pub completed_at: Option<String>, // ← 本次新增，ISO 8601 datetime
}
```

### 向后兼容

`load_from_disk` 中处理旧数据（缺少 `created_at` / `completed_at`）：

```rust
for todo in todos.iter_mut() {
    // ... 已有的兼容逻辑
    if todo.created_at.is_empty() {
        todo.created_at = chrono::Utc::now().to_rfc3339();
    }
    if todo.done && todo.completed_at.is_none() {
        todo.completed_at = Some(todo.created_at.clone()); // 或当前时间
    }
}
```

### 修改现有命令

```rust
// add_todo: 自动设置 created_at
#[tauri::command]
#[specta::specta]
pub async fn add_todo(
    app: AppHandle,
    content: String,
    due_date: Option<String>,
) -> Result<Vec<Todo>, String> {
    // ... 现有逻辑
    todos.push(Todo {
        id,
        content,
        done: false,
        priority: 3,
        tags: vec![],
        due_date,
        remind: false,
        archived: false,
        created_at: chrono::Utc::now().to_rfc3339(),  // ← 新增
        completed_at: None,
    });
    // ...
}

// toggle_todo: 自动设置/清除 completed_at
#[tauri::command]
#[specta::specta]
pub async fn toggle_todo(app: AppHandle, id: String) -> Result<Vec<Todo>, String> {
    // ...
    if let Some(todo) = todos.iter_mut().find(|t| t.id == id) {
        todo.done = !todo.done;
        todo.archived = todo.done;
        todo.completed_at = if todo.done {
            Some(chrono::Utc::now().to_rfc3339())
        } else {
            None
        };
    }
    // ...
}
```

### 前端变更

**新增组件**：
- `src/components/StatsPanel.tsx` — 统计面板

**新增文件**：
- `src/utils/stats.ts` — 统计计算（本周完成数、连续天数、7 天趋势）

**修改**：
- `App.tsx` — 添加统计面板入口（如 Archived 视图中显示）

---

## 迭代 #6：系统通知

### 目标
温和的系统桌面通知：仅在有"今天"到期任务且应用未聚焦时推送一次。

### 数据模型

**无新字段。** 复用迭代 #4 引入的 `remind` 和 `due_date`。

### 技术实现

**Rust 侧**（新增模块 `src-tauri/src/scheduler.rs`）：

```rust
use tauri_plugin_notification::NotificationExt;

/// 检查并推送通知，由前端定时调用或 Rust 内部定时触发
fn check_and_notify(app: &tauri::AppHandle) {
    let todos = load_todos_silent(app);
    let due_today = todos.iter()
        .filter(|t| !t.done && !t.archived && t.remind)
        .filter(|t| t.due_date.as_ref().map(|d| is_today(d)).unwrap_or(false))
        .count();

    if due_today > 0 && !app.is_focused() {
        app.notification()
            .builder()
            .title("Oasis Flow")
            .body(format!("今天有 {} 项任务待完成", due_today))
            .show()
            .unwrap();
    }
}
```

**前端配合**：
- 应用启动后每 15 分钟调用一次通知检查命令
- 应用获得焦点时重置通知状态（避免重复推送）

### Cargo.toml 变更

新增依赖：`tauri-plugin-notification = "2"`

---

## 迭代 #7：导出/导入迁移

### 目标
JSON 完整导出 + 导入，支持合并/替换模式。

### 数据模型

**无新字段。**

### 新增 Rust 命令

```rust
#[tauri::command]
#[specta::specta]
pub async fn export_todos(
    app: AppHandle,
    path: String,
) -> Result<(), String>;

#[tauri::command]
#[specta::specta]
pub async fn import_todos(
    app: AppHandle,
    path: String,
    mode: String, // "merge" | "replace"
) -> Result<Vec<Todo>, String>;
```

### 前端变更

**新增组件**：
- `src/components/ExportImportButtons.tsx` — 导出/导入按钮组

**导入校验**：
- 验证 JSON 结构是否为 Todo 数组
- 自动调用 `load_from_disk` 的向后兼容逻辑处理旧格式

---

## 迭代 #8：自然语言快速输入

### 目标
输入框支持 `买牛奶 tomorrow #生活 !3`，自动解析为内容 + 日期 + 标签 + 优先级。

### 数据模型

**无新字段。** 复用已有字段。

### 前端变更

**新增文件**：
- `src/utils/parseNaturalLanguage.ts`

```typescript
interface ParsedInput {
  content: string;
  due_date: string | null;
  tags: string[];
  priority: number | null;
}

export function parseNaturalLanguage(input: string): ParsedInput;
```

**解析规则**：
- `#tagname` → 标签（可多个）
- `!1-5` → 优先级
- `today` / `tomorrow` / `next week` / `in N days` / `mon/tue/...` → 日期
- `YYYY-MM-DD` → 精确日期
- 剩余文本 → 内容

**修改**：
- `TodoInput.tsx` — 提交前调用解析函数，将解析结果传给 `onAdd`

---

## 迭代 #9：系统托盘快速输入

### 目标
托盘图标点击 → 迷你浮窗 → 直接输入 → 回车添加。

### 数据模型

**无新字段。**

### Rust 侧

新增 `src-tauri/src/tray.rs`：

```rust
use tauri::tray::TrayIconBuilder;
use tauri::menu::{Menu, MenuItem};

pub fn setup_tray(app: &tauri::AppHandle) {
    let menu = Menu::with_items(app, &[
        &MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>).unwrap(),
        &MenuItem::with_id(app, "quick_add", "快速添加", true, None::<&str>).unwrap(),
        &MenuItem::with_id(app, "quit", "退出", true, None::<&str>).unwrap(),
    ]).unwrap();

    TrayIconBuilder::new()
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => { /* 显示主窗口 */ }
            "quick_add" => { /* 打开快速添加浮窗 */ }
            "quit" => { app.exit(0); }
            _ => {}
        })
        .build(app)
        .unwrap();
}
```

### 前端

快速添加浮窗：小型 Tauri 窗口（400×60, 无边框, 置顶），只含输入框。

---

## 迭代 #10：应用内快捷键

### 目标
常用操作支持键盘快捷键。

### 数据模型

**无新字段。**

### 前端变更

**新增文件**：
- `src/hooks/useKeyboardShortcuts.ts`

| 快捷键 | 动作 |
|--------|------|
| `Ctrl+N` / `Cmd+N` | 聚焦新建输入框 |
| `Ctrl+F` / `Cmd+F` | 聚焦搜索框 |
| `Esc` | 取消操作 / 清空筛选 |
| `Ctrl+1/2/3/4` | 切换分区 |
| `Ctrl+Enter` | 提交输入 |

---

## 迭代 #11：排序 & 筛选

### 目标
按优先级、日期、标签等维度排序和筛选。

### 数据模型

**无新字段。**

### 前端变更

**新增文件**：
- `src/hooks/useTodoSortFilter.ts`

```typescript
interface SortFilterState {
  sortBy: 'priority' | 'dueDate' | 'createdAt';
  sortOrder: 'asc' | 'desc';
  filterTags: string[];
  filterPriorityRange: [number, number] | null;
}
```

**新增组件**：
- `src/components/SortFilterBar.tsx`

---

## 迭代 #12：拖拽排序

### 目标
支持手动调整任务顺序。

### 数据模型变更 (Rust)

`Todo` 结构体新增字段：

```rust
pub struct Todo {
    // ... 已有字段
    pub order_index: u32,          // ← 本次新增，用于排序
}
```

### 新增 Rust 命令

```rust
#[tauri::command]
#[specta::specta]
pub async fn reorder_todos(
    app: AppHandle,
    ordered_ids: Vec<String>,
) -> Result<Vec<Todo>, String>;
```

### 前端

集成 HTML5 Drag & Drop API 或第三方库。

---

## 迭代 #13：子任务 / Checklist

### 目标
一个 Todo 下可展开多个子任务。

### 数据模型变更 (Rust)

新增结构体和字段：

```rust
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SubTask {
    pub id: String,
    pub content: String,
    pub done: bool,
}

pub struct Todo {
    // ... 已有字段
    pub subtasks: Vec<SubTask>,    // ← 本次新增
}
```

### 新增 Rust 命令

```rust
pub async fn add_subtask(app: AppHandle, todo_id: String, content: String) -> Result<Vec<Todo>, String>;
pub async fn toggle_subtask(app: AppHandle, todo_id: String, subtask_id: String) -> Result<Vec<Todo>, String>;
pub async fn delete_subtask(app: AppHandle, todo_id: String, subtask_id: String) -> Result<Vec<Todo>, String>;
```

---

## 迭代 #14：主题自定义

### 目标
用户可选择自定义强调色。

### 数据模型

**此字段属于用户设置，非 Todo。**

新增独立的 Settings 存储（如 `settings.json`）：

```rust
pub struct UserSettings {
    pub accent_color: String,        // HEX, 默认 "#3b82f6"
}
```

---

## 12. 设计规范

### 12.1 色彩系统

```css
:root {
  /* 基础色 */
  --bg: #f5f5f4;
  --surface: #ffffff;
  --surface-hover: #fafaf9;
  --border: #e7e5e4;

  /* 文字色 */
  --text: #292524;
  --text-secondary: #78716c;
  --text-muted: #a9a29e;

  /* 语义色 */
  --priority-5: #dc2626;
  --priority-4: #f97316;
  --priority-3: #3b82f6;
  --priority-2: #06b6d4;
  --priority-1: #a9a29e;
  --overdue: #f59e0b;
  --success: #10b981;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1c1917;
    --surface: #292524;
    --surface-hover: #33302e;
    --border: #44403c;
    --text: #f5f5f4;
    --text-secondary: #a8a29e;
    --text-muted: #78716c;
  }
}
```

### 12.2 字体与层级

| 层级 | 字号 | 字重 | 颜色 | 用途 |
|------|------|------|------|------|
| H1 (标题) | 24px | 700 | `--text` | 应用标题 |
| H2 (分区标题) | 18px | 600 | `--text` | 分区名称 |
| Body (任务内容) | 15px | 400 | `--text` | Todo 内容 |
| Meta (元数据) | 12px | 400 | `--text-muted` | 日期、标签 |
| Button (按钮) | 14px | 500 | `--text` / `--bg` | 按钮文字 |

### 12.3 动效系统

- 默认过渡：`ease`, `150-200ms`
- 回弹效果：`cubic-bezier(0.34, 1.56, 0.64, 1)`, `200ms`
- 平滑物理：`cubic-bezier(0.25, 0.46, 0.45, 0.94)`, `250-300ms`
- 触觉反馈：`navigator.vibrate(15)`

---

## 13. 编码规范

### 13.1 Rust 侧

1. **命令命名**：`snake_case`，如 `archive_todo`
2. **错误处理**：`Result<T, String>`，中文错误信息
3. **specta 注解**：每个命令必须同时标记 `#[tauri::command]` + `#[specta::specta]`
4. **数据模型变更**：
   - 新增字段必须有 `Default` 或显式迁移逻辑
   - `load_from_disk` 中**按需**添加向后兼容（只处理本次新增字段）
   - 变更后运行 `cargo test` 重新生成 TS 绑定

### 13.2 SolidJS / TypeScript 侧

1. **组件命名**：PascalCase，单文件默认导出
2. **钩子命名**：`use` 前缀 + camelCase
3. **工具函数**：camelCase，纯函数优先
4. **类型**：复用 `src/bindings.ts` 自动生成类型，不重复定义
5. **样式**：优先 UnoCSS 原子类，复杂样式写入 `src/styles/main.css`
6. **严格模式**：`noUnusedLocals: true`, `noUnusedParameters: true`

### 13.3 文件组织

```
src/
├── components/          # UI 组件
├── hooks/               # SolidJS 钩子
├── utils/               # 纯工具函数
├── constants.ts         # 常量（调色板等）
├── rsstore.tsx          # Tauri 存储封装
├── bindings.ts          # 自动生成（禁止手动修改）
├── App.tsx
├── index.tsx
└── styles/
    └── main.css

src-tauri/src/
├── main.rs
├── lib.rs               # 命令注册 + 初始化
├── store.rs             # 数据模型 + 存储命令
├── tray.rs              # 系统托盘（迭代 #9）
└── scheduler.rs         # 定时任务（迭代 #6）
```

### 13.4 版本号规则

遵循 SemVer：`MAJOR.MINOR.PATCH`

- **MINOR** 递增：每个迭代完成时
- **PATCH** 递增：迭代内的 bug 修复
- 当前：`0.2.0` → 迭代 #1 完成后 `0.3.0` → 迭代 #2 完成后 `0.3.1`

---

## 14. 数据模型增量演进规则

### 规则 1：绝不预添加字段

字段只在**该迭代需要被读写**时加入。如果迭代计划中提到某个字段但本次不实现其功能，就不加。

### 规则 2：向后兼容逻辑按需编写

```rust
// 正确：本次迭代新增了 archived 字段，只处理 archived
for todo in todos.iter_mut() {
    // 其他字段的兼容已在之前迭代处理
    if todo.archived == /* 无法区分默认 false 和旧数据缺失 */ {
        // 对于 bool，serde 反序列化旧 JSON 会自动用 Default=false
        // 但最好在加载后显式确保：
        // （实际上 serde 会正确处理，只需确保 struct 有 Default）
    }
}
```

### 规则 3：使用 Default trait

为 Todo 实现 `Default`，确保新增字段有明确默认值：

```rust
impl Default for Todo {
    fn default() -> Self {
        Self {
            id: generate_id(),
            content: String::new(),
            done: false,
            priority: 3,
            tags: vec![],
            due_date: None,
            remind: false,
            archived: false,
            created_at: chrono::Utc::now().to_rfc3339(),
            completed_at: None,
            order_index: 0,
            subtasks: vec![],
        }
    }
}
```

**注意**：`Default` 中应包含**当前所有已迭代**的字段，而非未来字段。

### 规则 4：迁移测试

每个迭代完成后必须测试：
1. 旧版 `todos.json`（只有 `id, content, done, due_date`）能否正常加载
2. 新创建的任务能否正常保存和加载
3. 混合数据（部分字段缺失）能否正常处理

### 演进记录表

| 迭代 | 新增字段 / 结构 | 默认值 | 向后兼容处理 |
|------|----------------|--------|------------|
| #1 | `archived: bool` | `false` | serde Default |
| #2 | `priority: u8` | `3` | 遍历填充 |
| #3 | `Tag { name, color }`, `tags: Vec<Tag>` | `[]` | 遍历填充 |
| #4 | `remind: bool` | `false` | serde Default |
| #5 | `created_at: String`, `completed_at: Option<String>` | 当前时间 / `None` | 遍历填充 |
| #12 | `order_index: u32` | `0` | 遍历填充（按原列表顺序赋值） |
| #13 | `SubTask { id, content, done }`, `subtasks: Vec<SubTask>` | `[]` | serde Default |

---

## 15. 附录：参考与灵感

### 设计灵感

| 应用 | 借鉴点 |
|------|--------|
| **Things 3** | "今天"分区概念、极简美学 |
| **Clear** | 手势交互、完成动效、色彩系统 |
| **Streaks** | 连续打卡、正向反馈 |
| **Todoist** | 自然语言输入解析 |
| **Apple Reminders** | 温和的通知策略 |

### 技术参考

- [Tauri v2 文档](https://tauri.app/)
- [SolidJS 文档](https://www.solidjs.com/)
- [UnoCSS 文档](https://unocss.dev/)
- [Lucide Icons](https://lucide.dev/)
- [tauri-specta](https://github.com/specta-rs/tauri-specta)

---

**版权**: 本文件属于 Oasis Flow 项目，采用 GPL-3.0-or-later 许可。
