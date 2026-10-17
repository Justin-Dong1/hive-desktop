# 蜂巢桌面 · HIVE DESKTOP

Windows 11 透明蜂窝桌面层，保留 Explorer、原生任务栏和当前壁纸。支持多屏图标布局、文件收纳、音乐控制、便签以及蜂巢挑战小游戏。

## 发布准备状态

当前版本为 1.1.3，包含 1.1.2 之后的稳定性修复及频谱 MIT 依赖迁移，旧安装包不包含这些改动。源码更新记录及公开前阻碍见 [公开前检查](docs/PUBLIC-READINESS.md)。暂勿将旧草稿发布为最新版本。

本项目原创代码采用 **GPL-3.0-only**，完整条款见 [LICENSE](LICENSE)；第三方代码与组件保留各自许可证，见 [第三方声明](THIRD_PARTY_NOTICES.md)。1.1.3 已将频谱依赖替换为 MIT 许可的 NAudio 2.2.1 Core / WASAPI 模块；旧 1.1.0 / 1.1.2 包仍只供历史归档，不公开分发。

## 普通用户：安装版（1.1.3 测试版）

**只想安装使用？只读本节和下面的“安装版：Wallpaper 与频谱”。不用编辑 JSON，不用下载 DLL，不用输入命令。**

在 GitHub Releases 中选择 `HiveDesktop-Setup-版本号-x64.exe`，不要下载 `Source code (zip)` 或 `.blockmap`。目前仓库为私有、版本为草稿，只有有权限的用户能访问，并非公开下载页。

### 安装或替换旧版怎么选？

| 你的情况 | 操作 |
| --- | --- |
| 第一次使用 | 下载 Setup.exe，安装到固定目录，再双击桌面“蜂巢桌面”。 |
| 已装旧安装版 | 先退出蜂巢桌面，备份用户数据，运行新 Setup.exe 并沿用原安装目录；不要先删除布局/便签目录。覆盖升级仍待完整验收。 |
| 以前用源码/VBS 版 | 退出旧版，Win+R 输入 `shell:startup`，把旧“蜂巢桌面”快捷方式移到备份目录暂存；保留旧程序，再装安装版。不要同时开启两种自启动。 |

备份方法：Win+R 输入 `%APPDATA%`，把其中的 `glass-hive-desktop` 文件夹复制到安全位置。替换的是程序，不是这个个人数据文件夹。

### 安装版：Wallpaper 与频谱

**Wallpaper 选项只是“联动启动程序”，不是选择/替换壁纸图片。**

1. 没安装 Wallpaper Engine：选择“使用当前壁纸”，不需要再做任何配置。
2. 已安装且想联动：选择“选择 Wallpaper 程序”。从 Steam 中打开 Wallpaper Engine 的本地安装文件夹，在文件选择窗口选其中的 `wallpaper64.exe`（也支持 `wallpaper32.exe`）。不要选 `Steam.exe`、图片、快捷方式或整个文件夹。
3. 更换具体壁纸：打开 Wallpaper Engine，在它里面选择并应用壁纸，蜂巢桌面透明显示其内容，不替你订阅或更换壁纸。
4. 重新选择程序/关闭联动：退出蜂巢桌面 → 开始菜单 `Hive Desktop` → `Setup` → 重新设置。安装版自动保存配置，不用改 JSON。
5. 验证：没有音乐且面板收起时，长条显示 Wallpaper Engine 运行状态代表检测到进程；只有时间表示未检测到。进程运行不能保证动画没被 Wallpaper 自身暂停。

**频谱已随安装包内置，与 Wallpaper 无关，不需要额外下载 DLL 或编译。**

1. 打开音乐播放器并开始播放一首歌曲。
2. 点击蜂巢面板，在设置中将“常规形态”选为“悬浮长条”，然后收起面板。
3. 检测到播放后，长条本身显示左右对称的频谱柱；它不是音乐页面里的进度条。圆点、展开面板、暂停播放时不显示频谱。
4. 如果不显示：先看“音乐”页是否识别到歌曲正在播放；没有识别到时，检查播放器的系统媒体控制设置。已识别但柱子不跳时，检查声音是否静音、是否输出到 Windows 默认播放设备。不同播放器版本的媒体会话支持不同，不保证任意音频软件都能触发。

版本区别：原 1.1.0 测试包存在“没有 Wallpaper 进程时频谱不显示”的问题，而且 Wallpaper 选择后缺少结果提示。请下载 **`HiveDesktop-Setup-1.1.3-x64.exe`**（并包含后续稳定性修复）：包含本次内圆裁切（不额外填白）、内外圆同心、悬停上浮、独立频谱及 Wallpaper 进程检测修复。不要再下载原 1.1.0 或本机未发布的 1.1.1 包。

安装包名称为 `HiveDesktop-Setup-1.1.3-x64.exe`，无需 Node.js、pnpm 或手动运行命令。安装向导支持选择安装位置，并创建桌面入口；首次启动可选择登录自启动、关联 Wallpaper Engine 或直接使用系统壁纸。选择后会显示配置与检测结果；保存路径不等于确认壁纸动画已播放。关闭安装向导不会自动接管桌面，双击“蜂巢桌面”后才进入。

发布附件同时提供 `SHA256SUMS.txt` 和 `release-manifest.json`，后者记录构建源码提交号和包内文件哈希；打包与运行自检均校验资源一致性。更新后保留用户已选择的“内圆/原图”样式，不强制重置个人布局。新用户没有旧布局，图标位置当然不会与开发者电脑完全相同，但使用的是相同界面和逻辑。

此版本尚未代码签名，Windows 可能提示未知发布者。只使用本仓库发布的文件并核对 SHA-256，不要为了安装而关闭系统安全防护。安装版仅支持 Windows x64。

开始菜单的 `Hive Desktop` 文件夹提供 `Setup`（退出蜂巢桌面后调整启动选项）和 `Restore Windows Desktop`（紧急恢复原桌面）。卸载前尝试恢复桌面，失败则保留恢复工具并中止卸载。卸载默认保留布局、便签和其他个人数据，不自动清空。

安装版与源码版共享 `%APPDATA%\glass-hive-desktop`，请勿同时运行；从源码版迁移时先退出源码版，并在 `shell:startup` 中移除旧源码启动快捷方式，再启用安装版自启动。安装版不会擅自删除旧快捷方式。覆盖安装保留个人数据，仍建议升级前备份该目录。

安装版诊断文件位于用户数据目录的 `diagnostics` 子目录，不写入安装文件夹。普通用户无需阅读下面的源码安装步骤。

测试范围和后续事项见 [安装版验收记录](docs/INSTALLER-TESTING.md)。当前不是静默自动更新版本，也未声明完成所有设备的安装/卸载验证。

**Wallpaper Engine 不是必需依赖。** 未安装或未运行、且没有播放音乐时，使用 Windows 当前壁纸，收起的长条只显示时间，点击仍可打开功能面板。本项目不包含壁纸文件或音乐软件。

已有首次设置记录时会沿用本机配置，不会自动重复弹出向导，可通过开始菜单 Setup 重设。新用户选择自己的 Wallpaper 安装路径，不要求与开发者相同；目前不自动搜索目录，移动程序后需要重新选择。个人路径不会随安装包分发。

## 开发者专用：源码安装与运行

以下仅供源码运行或开发使用。

环境：Windows 11 x64、正常运行的 Explorer、Windows PowerShell 5.1、Node.js 22/24、pnpm 10。开发机使用 Node.js 24；其他 Windows 版本未验证。无需管理员权限。源码安装首次需联网下载 Electron；普通用户请使用上面的独立安装包。

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

## 开发者专用：源码版 Wallpaper 配置（安装版请跳过）

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

## 开发者专用：源码版编译频谱（安装版已内置，请跳过）

音乐控制不依赖频谱组件。频谱使用 NAudio 2.2.1 WASAPI 回环分析系统播放声音，不采集麦克风、不上传音频。

仓库不附带二进制依赖。以下命令自动下载并校验官方 MIT 组件、保存许可并编译频谱，无需手动找 DLL：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\prepare-release.ps1
```

脚本使用 Windows .NET Framework 4.8 的 64 位 C# 编译器构建并自测。缺少编译器可跳过，不影响其他功能。来源及许可见 `THIRD_PARTY_NOTICES.md`。

## 使用说明

- 双击图标打开；拖动放入完整蜂窝；右键管理图标。删除真实桌面文件会同时影响原桌面，不只是隐藏展示。
- 文档、文件夹可放进文件收纳，再移回桌面。拖到悬浮面板可选择传送至其他屏幕。
- 设置支持蜂窝宽度 100–150 逻辑像素、步长 2；图标大小受蜂窝大小限制，可分别调整。支持网格偏移和常显空格。
- 面板提供功能、音乐、便签。长条可拖动，顶部/底部中心吸附；圆点保留边缘间距。所有屏幕至少保留一个入口。
- 音乐依赖 Windows 媒体会话。QQ 音乐、酷狗、酷我等能否显示封面、接受控制，取决于播放器版本和媒体设置，不保证所有版本完全支持。
- 便签本机保存、多屏共享；布局自动保存，最多保留 10 次历史布局备份。
- 蜂巢挑战：A/D 移动、W 跳跃、S 下落、空格挥锤、P 暂停、Esc 退出。采用当前桌面网格大小。

## 源码版自启动与桌面恢复（安装版请使用 Setup）

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

## 构建安装包

Windows x64 安装开发依赖后执行 `pnpm run dist`。脚本从官方来源取得可选 NAudio 依赖和许可，构建频谱组件/图标，再生成 `dist` 下的 NSIS 安装包。需 Windows .NET Framework C# 编译器，首次构建需要联网。安装包包含 Electron 和频谱依赖；这些二进制不提交到源码仓库。`pnpm run pack` 仅生成解包目录用于测试。发布前应补齐安装、覆盖升级、卸载和真实重启验收；不应把构建成功等同于完整验收。
