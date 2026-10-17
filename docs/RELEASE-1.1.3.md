# 1.1.3 安装测试版

包含此前所有便签、频谱恢复、多屏通知、媒体队列、图标加载、资源占用显示和备份面板修复，详情见 PUBLIC-READINESS.md。

- 将频谱组件迁移到 MIT 许可的 NAudio.Core / NAudio.Wasapi 2.2.1，移除新安装包中的 NAudio 1.10。
- 官方下载包固定 SHA-256 校验，构建时检查 NuGet 的 MIT 许可声明。
- 保留原有 WASAPI 回环采集、24 频段及左右对称显示，不采集麦克风。
- 新包保留 GPL-3.0、NAudio MIT、Electron / Chromium 第三方许可。
- 包内清单记录隐私邮箱历史重写之后的源码提交，禁止复用旧安装包。

普通用户只安装 Setup.exe，无需下载 DLL、编译频谱或配置 Node.js。Wallpaper Engine 可选且不附带；不同电脑首次使用时选择自己的 Wallpaper 程序路径。

版本仍为未签名测试草稿。自动测试不代表完成安装/卸载/升级/重启/所有播放器和声卡验收，不自动将仓库或 Release 公开。
