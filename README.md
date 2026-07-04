# Oasis Flow

<div align="center">

[![License](https://img.shields.io/badge/license-GPL--3.0--or--later-blue.svg?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.5.1-green.svg?style=for-the-badge)](package.json)
[![Stars](https://img.shields.io/github/stars/Una539/Oasis?style=for-the-badge&logo=github&color=yellow)](https://github.com/Una539/Oasis/stargazers)

<br/>

一款轻量、简洁的跨平台待办事项桌面应用。

</div>

## 产品哲学

> **Focus First** — 帮助用户专注于真正重要的事，而非记录更多。

Oasis Flow 是一款**低焦虑、高专注**的待办管理工具，不追求"记录一切"，而是：

- **默认看"今天"** — 打开应用第一眼看到的是今天该做的事，而非堆积如山的全部任务
- **温和处理过期** — 过期任务不制造焦虑，而是提供"重新安排"的温和选项
- **完成有正向反馈** — 每一次勾选都有愉悦的微交互，强化使用动力
- **输入极简** — 支持自然语言快速输入，减少上下文切换成本

## 功能特性

- **待办管理**：快速添加、编辑、完成和删除待办事项
- **截止日期**：支持为待办事项设置截止日期，内置日历选择器
- **优先级与标签**：支持 1-5 级优先级、多标签管理和按标签筛选
- **温和提醒**：支持今日到期任务的单任务提醒开关和系统通知
- **统计面板**：展示本周完成数、连续完成天数和 7 天完成趋势
- **数据持久化**：所有数据自动保存到本地文件，关闭应用后数据不丢失
- **跨平台支持**：支持 Windows、macOS、Linux 和 Android
- **响应式交互**：
  - **桌面端**：鼠标悬停显示删除按钮，点击即可删除
  - **移动端**：支持左滑删除手势，操作流畅自然
- **暗黑模式**：自动跟随系统主题切换，支持浅色/深色模式
- **安全区域适配**：自动适配刘海屏等安全区域，确保内容不被遮挡

## 环境要求

- [Node.js](https://nodejs.org/)（推荐 LTS 版本）
- [pnpm](https://pnpm.io/installation)
- [Rust](https://www.rust-lang.org/tools/install)
- 操作系统对应的 Tauri 系统依赖（参考 [Tauri 官方文档](https://tauri.app/start/prerequisites/)）

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/Una539/Oasis
cd Oasis
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 启动开发服务器

**完整开发模式（推荐）** — 同时启动前端和 Tauri 桌面窗口：

```bash
pnpm tauri dev
```

**仅前端开发** — 只调试前端界面（端口 1420）：

```bash
pnpm dev
```

#### Linux 渲染兼容开关

Oasis 会保留系统默认的 GTK 后端选择，不主动切换 `GDK_BACKEND`。这和 Clash Verge Rev 的处理方向一致，避免在 Wayland/XWayland 之间强行切换导致额外白屏问题。

在 Linux 下，Oasis 会按条件设置 `WEBKIT_DISABLE_DMABUF_RENDERER=1`：

- 检测到 NVIDIA 驱动/GPU
- Wayland 会话且 `wayland-client` 版本不高于 1.23.0
- 用户显式设置 `OASIS_DISABLE_DMABUF_RENDERER=1`

如果你想强制保留 WebKitGTK 的 DMABUF 渲染路径，可以手动覆盖：

```bash
OASIS_ENABLE_DMABUF_RENDERER=1 pnpm tauri dev
```

如果 Linux 下仍出现黑屏、窗口无法启动等 WebKitGTK/驱动兼容问题，也可以显式启用 DMABUF fallback：

```bash
OASIS_DISABLE_DMABUF_RENDERER=1 pnpm tauri dev
```

该开关会在启动前设置 `WEBKIT_DISABLE_DMABUF_RENDERER=1`。如果你已经手动设置了 `WEBKIT_DISABLE_DMABUF_RENDERER`，Oasis 会尊重现有值。

### 4. 构建生产版本

```bash
pnpm tauri build
```

构建完成后，安装包位于 `src-tauri/target/release/bundle/`。

## 移动端构建

本项目支持构建为 Android 应用（已实机测试）。**iOS 端未经测试**，欢迎社区协助验证。

构建前请确保已安装 Android SDK / NDK 和 JDK 17+（参考 [Tauri 移动端前置要求](https://v2.tauri.app/start/prerequisites/#android)）。

```bash
# 开发调试
pnpm tauri android dev

# Release 构建（需先在 src-tauri/gen/android/ 下配置 keystore.properties）
pnpm tauri android build
```

## 数据存储

应用数据持久化存储到系统应用数据目录下的 `todos.json` 文件中：

- **Windows**: `%APPDATA%\com.uno.oasis\todos.json`
- **macOS**: `~/Library/Application Support/com.uno.oasis/todos.json`
- **Linux**: `~/.local/share/com.uno.oasis/todos.json`

旧版本的 `com.oasis.app/todos.json` 会在首次启动时自动迁移到新目录。

## License

本项目采用 **GNU 通用公共许可证第三版或更高版本**（GPL-3.0-or-later）授权。

Copyright (C) 2026 Uno.

详见 [LICENSE](LICENSE) 文件。

---

如果你在使用过程中遇到任何问题，或有改进建议，欢迎提交 Issue 或 Pull Request！
