## Oasis Flow 0.7.0

### 新增
- 新增自然语言解析：支持 `明天`、`后天`、`周五`、`下周三`、`7月10日`、`7/10`、`next Friday`、`!2`、`p5` 等常见表达。
- 支持区分“想做日期”和“截止日期”，并可根据输入自动整理优先级。
- 版本号已同步到 `0.7.0`。

### 调整
- 更新了 release 流程约束：完成版本后，在准备 release 前必须先更新 `release-note.md`。

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
