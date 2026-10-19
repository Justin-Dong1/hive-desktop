!include "nsDialogs.nsh"

!ifndef BUILD_UNINSTALLER
Var DesktopShortcutCheckbox
Var CreateDesktopShortcut

!macro customInit
  StrCpy $CreateDesktopShortcut "1"
!macroend

Function DesktopShortcutPageCreate
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}
  ${NSD_CreateLabel} 0 0 100% 24u "桌面快捷方式不是运行蜂巢桌面的必需项，以后仍可从开始菜单启动。"
  Pop $0
  ${NSD_CreateCheckbox} 0 36u 100% 16u "在桌面创建“蜂巢桌面”快捷方式"
  Pop $DesktopShortcutCheckbox
  ${NSD_Check} $DesktopShortcutCheckbox
  nsDialogs::Show
FunctionEnd

Function DesktopShortcutPageLeave
  ${NSD_GetState} $DesktopShortcutCheckbox $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $CreateDesktopShortcut "1"
  ${Else}
    StrCpy $CreateDesktopShortcut "0"
  ${EndIf}
FunctionEnd

!macro customPageAfterChangeDir
  Page custom DesktopShortcutPageCreate DesktopShortcutPageLeave
!macroend

!macro customInstall
  ${If} $CreateDesktopShortcut == "1"
    CreateShortCut "$newDesktopLink" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
    WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
  ${Else}
    Delete "$newDesktopLink"
  ${EndIf}
  CreateDirectory "$SMPROGRAMS\Hive Desktop"
  CreateShortCut "$SMPROGRAMS\Hive Desktop\Setup.lnk" "$INSTDIR\HiveDesktop.exe" "--setup"
  CreateShortCut "$SMPROGRAMS\Hive Desktop\Restore Windows Desktop.lnk" "$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\app\tools\recover-desktop.ps1"'
  !ifdef APP_INSTALLER_STORE_FILE
    Delete "$LOCALAPPDATA\${APP_INSTALLER_STORE_FILE}"
    RMDir "$LOCALAPPDATA\glass-hive-desktop-updater"
  !endif
!macroend
!endif

!macro customUnInstall
  nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\app\tools\recover-desktop.ps1"'
  Pop $0
  Pop $1
  ${If} $0 != 0
    MessageBox MB_OK|MB_ICONSTOP "Desktop restoration failed. Uninstall was stopped to preserve recovery tools. Please retry after Explorer is running." /SD IDOK
    Abort
  ${EndIf}
  ${IfNot} ${isUpdated}
    nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\app\tools\recovery-task.ps1" -Remove'
    Pop $0
    Pop $1
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "HiveDesktop"
    Delete "$newDesktopLink"
    MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON1 "是否保留蜂巢桌面的个人数据？$\r$\n$\r$\n点击“是”：保留布局、便签、闹钟、倒计时、秒表计时、备份和自定义图标，方便以后重新安装。$\r$\n点击“否”：彻底删除上述个人数据和图标缓存。$\r$\n$\r$\n下载目录中的原始安装包不属于程序数据，如不需要可由你手动删除。" /SD IDYES IDYES keepUserData IDNO deleteUserData
deleteUserData:
    RMDir /r "$APPDATA\glass-hive-desktop"
    RMDir /r "$LOCALAPPDATA\GlassHiveDesktop"
    Goto userDataChoiceDone
keepUserData:
userDataChoiceDone:
  ${EndIf}
  Delete "$SMPROGRAMS\Hive Desktop\Setup.lnk"
  Delete "$SMPROGRAMS\Hive Desktop\Restore Windows Desktop.lnk"
  RMDir "$SMPROGRAMS\Hive Desktop"
  !ifdef APP_INSTALLER_STORE_FILE
    Delete "$LOCALAPPDATA\${APP_INSTALLER_STORE_FILE}"
    RMDir "$LOCALAPPDATA\glass-hive-desktop-updater"
  !endif
!macroend
