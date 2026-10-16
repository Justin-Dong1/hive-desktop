!macro customInstall
  CreateDirectory "$SMPROGRAMS\Hive Desktop"
  CreateShortCut "$SMPROGRAMS\Hive Desktop\Setup.lnk" "$INSTDIR\HiveDesktop.exe" "--setup"
  CreateShortCut "$SMPROGRAMS\Hive Desktop\Restore Windows Desktop.lnk" "$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\app\tools\recover-desktop.ps1"'
!macroend

!macro customUnInstall
  nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\app\tools\recover-desktop.ps1"'
  Pop $0
  Pop $1
  ${If} $0 != 0
    MessageBox MB_OK|MB_ICONSTOP "Desktop restoration failed. Uninstall was stopped to preserve recovery tools. Please retry after Explorer is running." /SD IDOK
    Abort
  ${EndIf}
  ${IfNot} ${isUpdated}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "HiveDesktop"
  ${EndIf}
  Delete "$SMPROGRAMS\Hive Desktop\Setup.lnk"
  Delete "$SMPROGRAMS\Hive Desktop\Restore Windows Desktop.lnk"
  RMDir "$SMPROGRAMS\Hive Desktop"
  ; Personal layouts and notes are deliberately retained.
!macroend
