# 蜂巢桌面 · HIVE DESKTOP

Windows 11 透明蜂窝桌面层，保留 Explorer、原生任务栏和当前壁纸。支持多屏图标布局、文件收纳、音乐控制、便签以及蜂巢挑战小游戏。

**Wallpaper Engine 不是必需依赖。** 未安装或未运行时，使用 Windows 当前壁纸，收起的长条只显示时间，点击仍可打开功能面板。运行时显示 Wallpaper Engine 状态，播放音乐时可显示频谱（需可选组件）。本项目不包含壁纸文件或音乐软件。

## 安装与运行

环境：Windows 11 x64、正常运行的 Explorer、Windows PowerShell 5.1、Node.js 22/24、pnpm 10。开发机使用 Node.js 24；其他 Windows 版本未验证。无需管理员权限。首次安装需联网下载 Electron，当前提供源码而非独立安装包。

有仓库访问权限的账户可下载 ZIP 并解压，或使用 Git：

```powershell
git clone https://github.com/Justin-Dong1/hive-desktop.git
cd hive-desktop
npm install -g pnpm@10
pnpm install --frozen-lockfile
pnpm run check
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\launch.ps1
```

也可安装 Node.js、pnpm 后双击 `安装组件.cmd`，再双击 `启动玻璃蜂窝桌面.vbs`（历史文件名为兼容旧快捷方式而保留）。项目应放在用户可写的固定目录，不要直接从 ZIP 中运行。开发调试可用 `pnpm start`，但不经过启动器的可选 Wallpaper 启动步骤。

## 可选：联动 Wallpaper Engine

默认不主动启动外部壁纸软件；已运行的 32/64 位 Wallpaper Engine 会自动检测。检测周期约 10 秒，没有运行时仅显示时间，不阻止桌面使用。

若希望联动启动，将 `wallpaper.config.example.json` 复制为 `wallpaper.config.json`，填写实际安装路径：

```json
{
  "autoStart": true,
  "executable": "D:\\SteamLibrary\\steamapps\\common\\wallpaper_engine\\wallpaper64.exe"
}
```

路径仅为示例。将 autoStart 改为 false 或删除本地配置即可关闭。配置错误、未安装、启动失败均不会阻止蜂巢桌面启动。退出蜂巢桌面不结束 Wallpaper Engine。个人配置不提交 Git。

桌面及游戏透视实际壁纸，不使用截图模拟动态背景。Wallpaper Engine 是否暂停仍受其自身性能/应用规则影响；进入游戏后壁纸暂停时请检查这些规则。没有 Wallpaper Engine 时使用系统壁纸，不会额外提供动态壁纸。

## 可选：实时频谱

音乐控制不依赖频谱组件。频谱使用 NAudio 1.10 WASAPI 回环分析系统播放声音，不采集麦克风、不上传音频。

仓库不附带二进制依赖。从 NAudio 官方 NuGet 包中取出 `lib/net35/NAudio.dll`，放入 `vendor/NAudio-1.10/NAudio.dll`，运行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\build-spectrum.ps1
```

脚本使用 Windows .NET Framework 64 位 C# 编译器构建并自测。缺少编译器可跳过，不影响其他功能。来源及许可见 `THIRD_PARTY_NOTICES.md`。

## 使用说明

- 双击图标打开；拖动放入完整蜂窝；右键管理图标。删除真实桌面文件会同时影响原桌面，不只是隐藏展示。
- 文档、文件夹可放进文件收纳，再移回桌面。拖到悬浮面板可选择传送至其他屏幕。
- 设置支持蜂窝宽度 100–150 逻辑像素、步长 2；图标大小受蜂窝大小限制，可分别调整。支持网格偏移和常显空格。
- 面板提供功能、音乐、便签。长条可拖动，顶部/底部中心吸附；圆点保留边缘间距。所有屏幕至少保留一个入口。
- 音乐依赖 Windows 媒体会话。QQ 音乐、酷狗、酷我等能否显示封面、接受控制，取决于播放器版本和媒体设置，不保证所有版本完全支持。
- 便签本机保存、多屏共享；布局自动保存，最多保留 10 次历史布局备份。
- 蜂巢挑战：A/D 移动、W 跳跃、S 下落、空格挥锤、P 暂停、Esc 退出。采用当前桌面网格大小。

## 自启动与桌面恢复

可选创建桌面快捷方式和当前用户登录自启动：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\install-startup.ps1
```

自启动延迟等待 Explorer 就绪。取消时 Win+R 输入 `shell:startup`，删除“蜂巢桌面”快捷方式，不影响个人布局。移动项目目录后需重新建立快捷方式。

正常退出使用桌面退出图标或面板退出功能。异常时双击 `恢复系统桌面.vbs`，停止本项目实例并恢复 Explorer 图标。不要删除桌面文件来解决显示问题。独立守护进程提供异常恢复，但无法保证覆盖所有系统故障。

不强制安装/运行 TranslucentTB，原生任务栏保留；不同 Windows 构建的玻璃效果可能不同。

## 数据与验证

个人数据通常位于 `%APPDATA%\glass-hive-desktop`，保留内部名称以兼容旧布局和便签。升级前建议备份。运行日志写入项目目录（如 launch-status.json、desktop-ready.json、watchdog.log），分享前检查路径和文件名等隐私。

仓库不包含个人布局、便签、截图、日志、node_modules、个人 Wallpaper 配置。卸载前先退出并取消自启动，再移除程序目录；个人数据单独备份。

```powershell
pnpm run check
node tools/test-wallpaper-optional.js
node tools/test-spectrum-ui.js
node tools/test-recovery-order.js
```

这些是代码回归检查，不等同于覆盖所有设备的重启、多屏热插拔、休眠和输入法体验。反馈问题请附系统版本、复现步骤和脱敏日志。

`main.js` / `preload.js` 为 Electron 主进程和桥接；`ui/` 为桌面界面；`tools/` 为 Windows 集成、恢复守护和测试。第三方许可见 `THIRD_PARTY_NOTICES.md`。
