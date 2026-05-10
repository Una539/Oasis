# Oasis Flow

<div align="center">

[![License](https://img.shields.io/badge/license-GPL--3.0--or--later-blue.svg?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-green.svg?style=for-the-badge)](package.json)
[![Stars](https://img.shields.io/github/stars/Una539/Oasis?style=for-the-badge&logo=github&color=yellow)](https://github.com/Una539/Oasis/stargazers)

[![Tauri](https://img.shields.io/badge/Tauri-v2-24C8DB?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app/)
[![SolidJS](https://img.shields.io/badge/SolidJS-1.9.3-2C4F7C?style=for-the-badge&logo=solid&logoColor=white)](https://www.solidjs.com/)
[![Rust](https://img.shields.io/badge/Rust-2021-000000?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)

[![Windows](https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)]()
[![macOS](https://img.shields.io/badge/macOS-000000?style=for-the-badge&logo=apple&logoColor=white)]()
[![Linux](https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black)]()
[![Android](https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)]()

<br/>

一款轻量、简洁的跨平台待办事项（Todo List）桌面应用，基于 **Tauri v2** + **SolidJS** + **Rust** 构建。

> Oasis Flow 致力于提供流畅的待办管理体验，无论是在桌面端还是移动端，都能轻松记录和追踪你的日常任务。

<br/>

[![GitHub Stats](https://github-readme-stats.vercel.app/api?username=Una539&show_icons=true&theme=default&hide_border=true&locale=cn)](https://github.com/Una539)
[![Top Languages](https://github-readme-stats.vercel.app/api/top-langs/?username=Una539&layout=compact&theme=default&hide_border=true&locale=cn)](https://github.com/Una539)

</div>

## 功能特性

- **待办管理**：快速添加、编辑、完成和删除待办事项
- **数据持久化**：所有数据通过 Rust 后端自动保存到本地文件，关闭应用后数据不丢失
- **跨平台支持**：基于 Tauri 构建，支持 Windows、macOS 和 Linux
- **响应式交互**：
  - **桌面端**：鼠标悬停显示删除按钮，点击即可删除
  - **移动端**：支持左滑删除手势，操作流畅自然
- **自动保存**：每次修改（添加、编辑、完成、删除）都会自动触发保存，无需手动操作
- **暗黑模式**：自动跟随系统主题切换，支持浅色/深色模式
- **安全区域适配**：自动适配刘海屏等安全区域，确保内容不被遮挡

## 技术栈

| 层级     | 技术                                                             |
| -------- | ---------------------------------------------------------------- |
| 前端框架 | [SolidJS](https://www.solidjs.com/) — 响应式、高性能的 UI 框架   |
| 构建工具 | [Vite](https://vitejs.dev/) — 下一代前端构建工具                 |
| 后端框架 | [Tauri v2](https://tauri.app/) — 使用 Web 技术构建跨平台桌面应用 |
| 后端语言 | [Rust](https://www.rust-lang.org/) — 安全、高性能的系统编程语言  |
| 包管理器 | [pnpm](https://pnpm.io/) — 快速、节省磁盘空间的包管理器          |
| 图标库   | [Lucide Solid](https://lucide.dev/) — 精美、一致的图标集合       |

## 环境要求

在开始之前，请确保你的开发环境已安装以下工具：

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

**方式一：完整开发模式（推荐）**

同时启动前端 Vite 开发服务器和 Tauri 桌面窗口：

```bash
pnpm tauri dev
```

**方式二：仅前端开发**

如果只需要调试前端界面，无需启动 Tauri 窗口：

```bash
pnpm dev
```

前端开发服务器运行在 **1420** 端口。

### 4. 构建生产版本

```bash
pnpm tauri build
```

构建完成后，安装包将位于 `src-tauri/target/release/bundle/` 目录下。

> **注意**：不要先单独运行 `pnpm build`，Tauri 会自动调用前端构建作为 `beforeBuildCommand`。

## 移动端构建

本项目基于 Tauri v2，支持构建为 Android 应用。**iOS 端目前未经测试**（由于开发者没有 Apple 设备，无法验证 iOS 兼容性，欢迎有设备的社区成员协助测试）。

### Android

Android 端**已实机测试**，功能运行正常。构建前请确保：

1. 已安装 Android SDK 和 NDK（参考 [Tauri 移动端前置要求](https://v2.tauri.app/start/prerequisites/#android)）
2. 已配置 Java 环境（JDK 17 或更高版本）

#### 开发调试

```bash
pnpm tauri android dev
```

#### Release 构建

构建 Release 版本**需要进行签名**。请在 `src-tauri/gen/android/` 目录下创建 `keystore.properties` 文件，内容格式如下：

```properties
storePassword=<你的密钥库密码>
keyPassword=<你的密钥密码>
keyAlias=<你的密钥别名>
storeFile=<密钥库文件的绝对路径>
```

示例：

```properties
storePassword=myStorePass
keyPassword=myKeyPass
keyAlias=my-key-alias
storeFile=/home/username/.android/my-release-key.jks
```

> **安全提示**：`keystore.properties` 已加入 `.gitignore`，不会被提交到版本控制。请妥善保管你的密钥文件和密码，不要泄露。

配置完成后，执行构建：

```bash
pnpm tauri android build
```

构建产物将输出到 `src-tauri/gen/android/app/build/outputs/bundle/universalRelease/` 目录。

## 常用命令

| 命令                        | 说明                                         |
| --------------------------- | -------------------------------------------- |
| `pnpm dev`                  | 仅启动前端 Vite 开发服务器（端口 1420）      |
| `pnpm tauri dev`            | 启动桌面端开发环境（前端 + Tauri 窗口）      |
| `pnpm tauri android dev`    | 启动 Android 开发环境（连接设备或模拟器）    |
| `pnpm build`                | 构建前端生产版本                             |
| `pnpm tauri build`          | 构建桌面应用安装包                           |
| `pnpm tauri android build`  | 构建 Android 应用（需配置签名）              |
| `pnpm tauri`                | 查看 Tauri CLI 所有可用命令                  |

## 项目结构

```
Oasis/
├── src/                      # 前端源码（SolidJS + TypeScript）
│   ├── App.tsx               # 主应用组件，包含 Todo 列表界面和交互逻辑
│   ├── rsstore.tsx           # 自定义 Store，封装 Tauri 数据持久化
│   ├── index.tsx             # 应用入口文件
│   ├── App.css               # 全局样式，包含主题变量和响应式布局
│   ├── vite-env.d.ts         # Vite 类型声明
│   └── assets/               # 静态资源
├── src-tauri/                # Tauri 后端（Rust）
│   ├── src/
│   │   ├── main.rs           # 应用入口
│   │   ├── lib.rs            # Tauri 命令注册和初始化
│   │   └── store.rs          # Rust 数据存储命令（save_todos / load_todos）
│   ├── Cargo.toml            # Rust 依赖配置
│   ├── tauri.conf.json       # Tauri 应用配置
│   └── icons/                # 应用图标
├── package.json              # Node.js 项目配置
├── vite.config.ts            # Vite 构建配置
├── tsconfig.json             # TypeScript 配置
├── LICENSE                   # GPLv3 许可证全文
├── README.md                 # 本文件
└── AGENTS.md                 # AI Agent 开发指南
```

## 数据存储

应用数据通过 Rust 后端持久化存储到系统应用数据目录下的 `todos.json` 文件中：

- **Windows**: `%APPDATA%\com.oasis.app\todos.json`
- **macOS**: `~/Library/Application Support/com.oasis.app/todos.json`
- **Linux**: `~/.local/share/com.oasis.app/todos.json`

数据会在每次修改时自动保存，无需手动操作。

## 开发规范

- TypeScript 启用 **严格模式**，且要求没有未使用的变量和参数
- JSX 使用 `solid-js` 作为导入源
- 添加新的 Rust 命令时，需在 `src-tauri/src/lib.rs` 的 `tauri::generate_handler![...]` 中注册
- 所有源代码文件均保留 GPLv3 许可证头

## License

本项目采用 **GNU 通用公共许可证第三版或更高版本**（GPL-3.0-or-later）授权。

Copyright (C) 2026 Uno.

详见 [LICENSE](LICENSE) 文件。

---

如果你在使用过程中遇到任何问题，或有改进建议，欢迎提交 Issue 或 Pull Request！
