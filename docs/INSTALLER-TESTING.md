# 1.1.0 安装版验收记录

## 已验证

- NSIS x64 安装包成功构建，嵌入 Electron，无需用户另装 Node.js/pnpm。
- 解包版真实 EXE 启动测试通过：独立临时配置目录，10 个必要资源存在，频谱 FFT 自测通过，退出码 0。测试不接管当前桌面。
- 首次引导取消、手动启动、未关联 Wallpaper、重复启动和个人数据不被覆盖的单元测试通过。
- Wallpaper 可选检测、退出时 Apply/Restore 顺序、布局持久化、便签恢复回归测试通过。
- 安装包未签名，不能将构建日志中的 signing 步骤理解为已经取得数字签名。

## 尚需交互/独立环境验收

- 安装向导中文显示、路径选择、开始菜单和桌面快捷方式。
- 真正执行首次安装、同版本/跨版本覆盖升级、卸载及卸载恢复失败分支。
- 首次引导后真实进入蜂巢桌面，退出恢复；真实重启、自启动、多屏热插拔、休眠恢复。
- 无 Wallpaper Engine 的独立电脑、不同 Windows 缩放设置。

不自动在开发者当前桌面执行卸载测试，避免影响原有正在使用的源码版。建议 Windows 测试账户或虚拟机完成以上检查后，再发布稳定版本。

## 自测命令

```powershell
pnpm run check
node tools/test-first-run.js
node tools/test-wallpaper-optional.js
node tools/test-recovery-order.js
node tools/test-layout-store.js
node tools/test-note-recovery.js
pnpm run dist
```

打包 EXE 可用 `--package-smoke --smoke-report=<绝对路径.json>` 执行独立配置目录的资源和频谱验证，不接管桌面。临时测试目录保留供诊断。

## 后续版本

应用内更新提醒、安装失败回退、签名、可选清理个人数据和图形化诊断中心暂不在本次实现范围。首次设置暂用系统对话框，图标大小/收纳仍进入桌面后在设置中调整。
