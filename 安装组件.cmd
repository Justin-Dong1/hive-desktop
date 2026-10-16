@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在安装蜂巢桌面运行组件...
call pnpm install --frozen-lockfile
if errorlevel 1 (
  echo.
  echo 安装失败，请检查网络或 pnpm 是否可用。
  pause
  exit /b 1
)
echo.
echo 安装完成。现在可以双击“启动玻璃蜂窝桌面.vbs”。
pause
