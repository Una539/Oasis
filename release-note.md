## Oasis Flow 0.7.1

### 新增
- 统一了桌面端和移动端的日期编辑入口，现在可以在同一个日期控件里切换“想做日期”和“截止日期”。
- 移动端的 todo 卡片重构为上下两行布局，日期标签可以双击进入编辑。
- 新增日期控件的显式确认按钮，减少输入未提交的情况。
- Todo 输入区新增手动控制面板，支持展开日期选择和“必做”切换。
- 补充了今日推荐路由的回归测试，确保在未来事项为空时仍会推荐进入灵感箱。

### 调整
- 修正 release workflow，避免在 macOS、Windows、Linux 三个构建 job 中重复创建草稿 Release。
- 调整了移动端 todo 卡片、日期 chip 和输入区的样式与交互状态。

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
