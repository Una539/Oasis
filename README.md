# Oasis Flow

<div align="center">

[![License](https://img.shields.io/badge/license-GPL--3.0--or--later-blue.svg?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.7.0-green.svg?style=for-the-badge)](package.json)
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
- **输入极简** — 后端支持自然语言快速输入，减少上下文切换成本

## 功能特性

- **待办管理**：快速添加、编辑、完成和删除待办事项
- **自然语言快速添加**：支持 `明天`、`截止周五`、`7月10日`、`!2` 等后端解析
- **想做 / 截止日期**：区分计划日期和真正截止日，支持直接日期输入
- **优先级**：支持 1-5 级优先级，快速添加时可解析优先级标记
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

第一次使用 Oasis Flow？请阅读[面向普通用户的使用教程](docs/user-guide.md)。

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

### 4. 构建生产版本

```bash
pnpm tauri build
```

构建完成后，安装包位于 `src-tauri/target/release/bundle/`。

## 移动端构建

#### 安卓

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

## License

本项目采用 **GNU 通用公共许可证第三版或更高版本**（GPL-3.0-or-later）授权。

Copyright (C) 2026 Uno.

详见 [LICENSE](LICENSE) 文件。

---

如果你在使用过程中遇到任何问题，或有改进建议，欢迎提交 Issue 或 Pull Request！
