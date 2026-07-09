## Oasis Flow 0.8.0

### 新增
- 新增全局搜索入口，桌面端位于侧栏“更多”，移动端位于顶部搜索按钮。
- 搜索覆盖今日、以后、灵感和已完成任务，不依赖标签系统。
- 搜索支持按任务内容、想做日期、截止日期、完成日期和优先级标记匹配，例如 `p1` 或 `!3`。

### 调整
- 搜索结果按分区分组展示，未完成和已完成任务都可以直接编辑、删除或切换完成状态。
- 搜索场景下切换任务完成状态不会误触发“今日清空”跳转推荐。

### 验证
- `cargo test`
- `pnpm exec tsc --noEmit`
- `pnpm build`
- `pnpm tauri build --no-bundle`

## 安装说明
- Windows: 下载 `oasis_VERSION_win.msi` 并运行安装
- macOS: 下载 `oasis_VERSION_mac_ARCH.dmg` 并拖拽到 Applications
- Linux: 下载 `oasis_VERSION_linux_ARCH.AppImage`、`oasis_VERSION_linux_ARCH.deb` 或 `oasis_VERSION_linux_ARCH.rpm`
- Android: 下载 `oasis_VERSION_android_ARCH.apk` 并安装到 Android 设备

## 许可证
本项目采用 GPL-3.0-or-later 许可证。
