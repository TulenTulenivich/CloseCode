Unicode true
SetCompressor /SOLID lzma
SetCompressorDictSize 64
RequestExecutionLevel user

!ifndef OUT_FILE
  !define OUT_FILE "proto-setup.exe"
!endif
!ifndef APP_VERSION
  !define APP_VERSION "0.1.0"
!endif
!ifndef PAYLOAD_MB
  !define PAYLOAD_MB "113"
!endif
!ifndef INSTALL_MB
  !define INSTALL_MB "${PAYLOAD_MB}"
!endif
!ifndef PAYLOAD_KB
  !define PAYLOAD_KB "110000"
!endif
!ifndef PAYLOAD_FILES
  !define PAYLOAD_FILES "1"
!endif
!ifndef PAYLOAD_INCLUDE
  !define PAYLOAD_INCLUDE "payload.loader.nsh"
!endif
!ifndef INSTALLER_ICON
  !define INSTALLER_ICON "..\icon.ico"
!endif
!ifndef RCEDIT_EXE
  !define RCEDIT_EXE ""
!endif
!ifdef WEB_INSTALL
  !ifndef RUNTIME_URL
    !define RUNTIME_URL "https://github.com/electron/electron/releases/download/v45.0.0/electron-v45.0.0-win32-x64.zip"
  !endif
  !ifndef RUNTIME_MIRROR
    !define RUNTIME_MIRROR "https://npmmirror.com/mirrors/electron/45.0.0/electron-v45.0.0-win32-x64.zip"
  !endif
  !ifndef RUNTIME_BYTES
    !define RUNTIME_BYTES "158223852"
  !endif
  !ifndef RUNTIME_MB
    !define RUNTIME_MB "151"
  !endif
  !ifndef RUNTIME_SHA256
    !define RUNTIME_SHA256 "ae53887a23bb640369c93dbd38c408a2af5c0deb86f2fa76c6c244cb444b7f47"
  !endif
  !ifndef RUNTIME_TAG
    !define RUNTIME_TAG "45.0.0"
  !endif
!endif

Name "CloseCode"
OutFile "${OUT_FILE}"
Icon "${INSTALLER_ICON}"
UninstallIcon "${INSTALLER_ICON}"
InstallDir "$LOCALAPPDATA\Programs\CloseCode"
InstallDirRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CloseCode" "InstallLocation"
ShowInstDetails show
ShowUninstDetails nevershow
BrandingText "CloseCode"

!define APP_NAME "CloseCode"
!define APP_EXE "CloseCode.exe"
!define UNINST_EXE "Uninstall CloseCode.exe"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\CloseCode"

VIProductVersion "${APP_VERSION}.0"
VIAddVersionKey "ProductName" "CloseCode"
VIAddVersionKey "FileDescription" "CloseCode setup"
VIAddVersionKey "FileVersion" "${APP_VERSION}"
VIAddVersionKey "ProductVersion" "${APP_VERSION}"
VIAddVersionKey "CompanyName" "CloseCode"
VIAddVersionKey "LegalCopyright" "MIT"

!define MUI_ICON "${INSTALLER_ICON}"
!define MUI_UNICON "${INSTALLER_ICON}"

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "WinMessages.nsh"

!addplugindir /x86-unicode "${__FILEDIR__}\plugins\x86-unicode"

!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_NOAUTOCLOSE
!define MUI_WELCOMEPAGE_TEXT "$(L_WELCOME_TEXT)"
!define MUI_FINISHPAGE_TEXT "$(L_FINISH_TEXT)"
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "$(L_RUN)"
!define MUI_UNTEXT_CONFIRM_TEXT "$(L_UN_CONFIRM_TEXT)"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Russian"
!insertmacro MUI_LANGUAGE "English"

LangString L_WELCOME_TEXT ${LANG_ENGLISH} "This wizard installs CloseCode for the current user.$\r$\n$\r$\nThe app is small: its Electron runtime is downloaded from the official release and checked against a pinned SHA-256 checksum before anything is written to disk."
LangString L_WELCOME_TEXT ${LANG_RUSSIAN} "Мастер установит CloseCode для текущего пользователя.$\r$\n$\r$\nПриложение маленькое: среда Electron скачивается с официального релиза и перед распаковкой проверяется по закреплённой сумме SHA-256."
!ifndef WEB_INSTALL
LangString L_WELCOME_TEXT ${LANG_ENGLISH} "This wizard installs CloseCode for the current user.$\r$\n$\r$\nAll components are already inside this setup."
LangString L_WELCOME_TEXT ${LANG_RUSSIAN} "Мастер установит CloseCode для текущего пользователя.$\r$\n$\r$\nВсе компоненты уже находятся внутри установщика."
!endif
LangString L_FINISH_TEXT ${LANG_ENGLISH} "CloseCode is installed. Settings, API keys and chat history stay on this device."
LangString L_FINISH_TEXT ${LANG_RUSSIAN} "CloseCode установлен. Настройки, ключи API и история чатов остаются на этом устройстве."
LangString L_RUN ${LANG_ENGLISH} "Launch CloseCode"
LangString L_RUN ${LANG_RUSSIAN} "Запустить CloseCode"
LangString L_UN_CONFIRM_TEXT ${LANG_ENGLISH} "The app folder and shortcuts will be removed. Settings, API keys and chat history will be kept on this device."
LangString L_UN_CONFIRM_TEXT ${LANG_RUSSIAN} "Папка приложения и ярлыки будут удалены. Настройки, ключи API и история чатов останутся на этом устройстве."
LangString L_CLOSE_APP ${LANG_ENGLISH} "Closing running copies of CloseCode..."
LangString L_CLOSE_APP ${LANG_RUSSIAN} "Закрываю запущенные копии CloseCode..."
LangString L_OLD_VERSION ${LANG_ENGLISH} "Removing the previous version..."
LangString L_OLD_VERSION ${LANG_RUSSIAN} "Удаляю предыдущую версию..."
LangString L_DL_START ${LANG_ENGLISH} "Downloading the Electron runtime (~${RUNTIME_MB} MB)..."
LangString L_DL_START ${LANG_RUSSIAN} "Скачиваю среду Electron (~${RUNTIME_MB} МБ)..."
LangString L_DL_PROGRESS ${LANG_ENGLISH} "Downloading the runtime: "
LangString L_DL_PROGRESS ${LANG_RUSSIAN} "Загрузка среды: "
LangString L_DL_DONE ${LANG_ENGLISH} "Runtime downloaded."
LangString L_DL_DONE ${LANG_RUSSIAN} "Среда загружена."
LangString L_VERIFY ${LANG_ENGLISH} "Checking the SHA-256 checksum..."
LangString L_VERIFY ${LANG_RUSSIAN} "Проверяю сумму SHA-256..."
LangString L_EXTRACT ${LANG_ENGLISH} "Unpacking the runtime..."
LangString L_EXTRACT ${LANG_RUSSIAN} "Распаковываю среду..."
LangString L_PREPARE ${LANG_ENGLISH} "Preparing the application..."
LangString L_PREPARE ${LANG_RUSSIAN} "Готовлю приложение..."
LangString L_FILES ${LANG_ENGLISH} "Copying application files..."
LangString L_FILES ${LANG_RUSSIAN} "Копирую файлы приложения..."
LangString L_SHORTCUTS ${LANG_ENGLISH} "Creating shortcuts..."
LangString L_SHORTCUTS ${LANG_RUSSIAN} "Создаю ярлыки..."
LangString L_REGISTER ${LANG_ENGLISH} "Registering the application..."
LangString L_REGISTER ${LANG_RUSSIAN} "Регистрирую приложение..."
LangString L_DONE ${LANG_ENGLISH} "Installation complete."
LangString L_DONE ${LANG_RUSSIAN} "Установка завершена."
LangString L_ERR_DIR ${LANG_ENGLISH} "Cannot create this folder. Choose another one."
LangString L_ERR_DIR ${LANG_RUSSIAN} "Не удалось создать эту папку. Выберите другую."
LangString L_ERR_DOWNLOAD ${LANG_ENGLISH} "The runtime could not be downloaded. Check the internet connection and run the setup again."
LangString L_ERR_DOWNLOAD ${LANG_RUSSIAN} "Не удалось скачать среду. Проверьте подключение к интернету и запустите установщик снова."
LangString L_ERR_CHECKSUM ${LANG_ENGLISH} "The downloaded runtime failed the checksum check. Run the setup again."
LangString L_ERR_CHECKSUM ${LANG_RUSSIAN} "Загруженная среда не прошла проверку суммы. Запустите установщик снова."
LangString L_ERR_EXTRACT ${LANG_ENGLISH} "The runtime could not be unpacked. Run the setup again."
LangString L_ERR_EXTRACT ${LANG_RUSSIAN} "Не удалось распаковать среду. Запустите установщик снова."

Var installFailed
Var installError
Var progressBar
Var lastPercent
Var oldDir
Var oldUninst
!ifdef WEB_INSTALL
Var runtimeDir
Var runtimeZip
Var runtimePart
Var runtimeUrl
Var runtimeHandle
Var runtimeThread
Var runtimeExit
Var downloadOk
!endif

Function .onInit
  System::Call 'kernel32::GetUserDefaultUILanguage() i.R0'
  IntOp $R0 $R0 & 1023
  ${If} $R0 == 25
    StrCpy $LANGUAGE ${LANG_RUSSIAN}
  ${Else}
    StrCpy $LANGUAGE ${LANG_ENGLISH}
  ${EndIf}
  StrCpy $installFailed 0
  StrCpy $installError ""
  StrCpy $progressBar 0
  StrCpy $lastPercent 0
  !ifdef WEB_INSTALL
    SectionSetSize 0 ${PAYLOAD_KB}
  !endif
FunctionEnd

Function un.onInit
  System::Call 'kernel32::GetUserDefaultUILanguage() i.R0'
  IntOp $R0 $R0 & 1023
  ${If} $R0 == 25
    StrCpy $LANGUAGE ${LANG_RUSSIAN}
  ${Else}
    StrCpy $LANGUAGE ${LANG_ENGLISH}
  ${EndIf}
FunctionEnd

Function FindOldInstall
  StrCpy $oldDir ""
  StrCpy $oldUninst ""
  StrCpy $R0 0
  ${Do}
    EnumRegKey $R1 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall" $R0
    ${If} $R1 == ""
      ${ExitDo}
    ${EndIf}
    ReadRegStr $R2 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\$R1" "DisplayName"
    ${If} $R2 == "${APP_NAME}"
      ReadRegStr $oldDir HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\$R1" "InstallLocation"
      ReadRegStr $R3 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\$R1" "QuietUninstallString"
      ${If} $R3 == ""
        ReadRegStr $R3 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\$R1" "UninstallString"
        ${If} $R3 != ""
          StrCpy $R3 '$R3 /S'
        ${EndIf}
      ${EndIf}
      StrCpy $oldUninst $R3
      ${ExitDo}
    ${EndIf}
    IntOp $R0 $R0 + 1
    ${If} $R0 > 400
      ${ExitDo}
    ${EndIf}
  ${Loop}
FunctionEnd

Section "-Install"
  SetShellVarContext current
  StrCpy $installFailed 0
  StrCpy $installError ""
  FindWindow $0 "#32770" "" $HWNDPARENT
  GetDlgItem $progressBar $0 1004
  StrCpy $lastPercent 0

  DetailPrint "$(L_CLOSE_APP)"
  nsExec::Exec 'taskkill /IM "${APP_EXE}" /F'
  Pop $R0
  Sleep 250

  Call FindOldInstall
  ${If} $oldUninst != ""
  ${AndIf} $oldDir != $INSTDIR
    DetailPrint "$(L_OLD_VERSION)"
    ExecWait '$oldUninst'
    Sleep 600
  ${EndIf}

  ClearErrors
  CreateDirectory "$INSTDIR"
  ${If} ${errors}
    StrCpy $installFailed 1
    StrCpy $installError "$(L_ERR_DIR)"
  ${EndIf}

  ${If} $installFailed == 0
  !ifdef WEB_INSTALL
    Call InstallRuntime
  !endif
  ${EndIf}

  ${If} $installFailed == 0
    DetailPrint "$(L_FILES)"
    SetOutPath "$INSTDIR"
    !include "${PAYLOAD_INCLUDE}"

    WriteUninstaller "$INSTDIR\${UNINST_EXE}"
    FileOpen $0 "$INSTDIR\.closecode" w
    FileWrite $0 "CloseCode ${APP_VERSION}"
    FileClose $0

    DetailPrint "$(L_SHORTCUTS)"
    CreateDirectory "$SMPROGRAMS"
    CreateShortCut "$SMPROGRAMS\CloseCode.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_EXE}" 0
    CreateShortCut "$DESKTOP\CloseCode.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_EXE}" 0

    DetailPrint "$(L_REGISTER)"
    WriteRegStr HKCU "${UNINST_KEY}" "DisplayName" "${APP_NAME}"
    WriteRegStr HKCU "${UNINST_KEY}" "DisplayVersion" "${APP_VERSION}"
    WriteRegStr HKCU "${UNINST_KEY}" "Publisher" "CloseCode"
    WriteRegStr HKCU "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\${APP_EXE}"
    WriteRegStr HKCU "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
    WriteRegStr HKCU "${UNINST_KEY}" "UninstallString" '"$INSTDIR\${UNINST_EXE}"'
    WriteRegStr HKCU "${UNINST_KEY}" "QuietUninstallString" '"$INSTDIR\${UNINST_EXE}" /S'
    WriteRegDWord HKCU "${UNINST_KEY}" "NoModify" 1
    WriteRegDWord HKCU "${UNINST_KEY}" "NoRepair" 1
    WriteRegDWord HKCU "${UNINST_KEY}" "EstimatedSize" ${PAYLOAD_KB}

    !ifdef WEB_INSTALL
      Delete "$runtimeZip"
      RMDir "$runtimeDir"
    !endif

    DetailPrint "$(L_DONE)"
    ${If} $progressBar != 0
      SendMessage $progressBar ${PBM_SETPOS} 100 0
    ${EndIf}
  ${Else}
    ${If} ${Silent}
      SetErrorLevel 3
      Quit
    ${Else}
      MessageBox MB_ICONSTOP "$installError"
      SetErrorLevel 3
      Quit
    ${EndIf}
  ${EndIf}
SectionEnd

Section "Uninstall"
  SetShellVarContext current
  nsExec::Exec 'taskkill /IM "${APP_EXE}" /F'
  Pop $R0
  Sleep 250

  IfFileExists "$INSTDIR\.closecode" 0 unTargeted
    RMDir /r "$INSTDIR"
    Goto unFilesDone
  unTargeted:
    Delete "$INSTDIR\${APP_EXE}"
    Delete "$INSTDIR\${UNINST_EXE}"
    Delete "$INSTDIR\.closecode"
    RMDir /r "$INSTDIR\resources"
    RMDir /r "$INSTDIR\locales"
    RMDir "$INSTDIR"
  unFilesDone:

  Delete "$DESKTOP\CloseCode.lnk"
  Delete "$SMPROGRAMS\CloseCode.lnk"
  DeleteRegKey HKCU "${UNINST_KEY}"
  !ifdef WEB_INSTALL
    RMDir /r "$LOCALAPPDATA\CloseCode\installer-cache"
  !endif
SectionEnd


!ifdef WEB_INSTALL

Function InstallRuntime
  StrCpy $downloadOk 0
  StrCpy $runtimeDir "$LOCALAPPDATA\CloseCode\installer-cache"
  CreateDirectory "$LOCALAPPDATA\CloseCode"
  CreateDirectory "$runtimeDir"
  StrCpy $runtimeZip "$runtimeDir\electron-v${RUNTIME_TAG}-win32-x64.zip"
  StrCpy $runtimePart "$runtimeDir\electron-runtime.part"

  ${If} ${FileExists} "$runtimeZip"
    DetailPrint "$(L_VERIFY)"
    Call VerifyRuntimeFile
    ${If} $downloadOk == 1
      Call ExtractionPhase
      Return
    ${EndIf}
    Delete "$runtimeZip"
  ${EndIf}

  DetailPrint "$(L_DL_START)"
  ${If} $progressBar != 0
    SendMessage $progressBar ${PBM_SETPOS} 0 0
  ${EndIf}

  Delete "$runtimePart"
  StrCpy $runtimeUrl "${RUNTIME_URL}"
  Call TryDownload
  ${If} $downloadOk != 1
    StrCpy $runtimeUrl "${RUNTIME_MIRROR}"
    Call TryDownload
  ${EndIf}
  ${If} $downloadOk != 1
    StrCpy $installFailed 1
    StrCpy $installError "$(L_ERR_DOWNLOAD)"
    Return
  ${EndIf}
  DetailPrint "$(L_DL_DONE)"

  DetailPrint "$(L_VERIFY)"
  ${If} $progressBar != 0
    SendMessage $progressBar ${PBM_SETPOS} 92 0
  ${EndIf}
  Call VerifyRuntimeFile
  ${If} $downloadOk != 1
    Delete "$runtimePart"
    StrCpy $installFailed 1
    StrCpy $installError "$(L_ERR_CHECKSUM)"
    Return
  ${EndIf}

  Delete "$runtimeZip"
  Rename "$runtimePart" "$runtimeZip"
  Call ExtractionPhase
FunctionEnd

Function TryDownload
  StrCpy $downloadOk 0
  Delete "$runtimePart"
  Call StartDownload
  ${If} $runtimeHandle == 0
    Return
  ${EndIf}
  Call WaitDownload
  ${If} $runtimeExit == 0
    StrCpy $downloadOk 1
  ${Else}
    Delete "$runtimePart"
  ${EndIf}
FunctionEnd

Function StartDownload
  StrCpy $runtimeHandle 0
  StrCpy $runtimeThread 0
  ${If} ${FileExists} "$SYSDIR\curl.exe"
    StrCpy $R0 "$SYSDIR\curl.exe -L --fail --silent --show-error --retry 2 --retry-delay 2 --connect-timeout 20 --output electron-runtime.part $runtimeUrl"
  ${Else}
    Call WriteDownloadScript
    StrCpy $R0 "$SYSDIR\WindowsPowerShell\v1.0\powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File dl.ps1"
  ${EndIf}

  System::Alloc 68
  Pop $R2
  System::Call 'kernel32::RtlZeroMemory(p R2, i 68)'
  System::Call '*$R2(i 68)'
  System::Alloc 16
  Pop $R3
  System::Call 'kernel32::RtlZeroMemory(p R3, i 16)'
  System::Call 'kernel32::CreateProcessW(p 0, w "$R0", p 0, p 0, i 0, i 0x08000000, p 0, w "$runtimeDir", p R2, p R3) i.R4'
  ${If} $R4 == 0
    System::Free $R2
    System::Free $R3
    Return
  ${EndIf}
  System::Call '*$R3(p.R5, p.R6, i.R7, i.R8)'
  System::Free $R2
  System::Free $R3
  StrCpy $runtimeHandle $R5
  StrCpy $runtimeThread $R6
FunctionEnd

Function WriteDownloadScript
  FileOpen $R5 "$runtimeDir\dl.ps1" w
  FileWrite $R5 "$$ProgressPreference = 'SilentlyContinue'$\r$\n"
  FileWrite $R5 "$$ErrorActionPreference = 'Stop'$\r$\n"
  FileWrite $R5 "$$dir = Split-Path -Parent $$MyInvocation.MyCommand.Path$\r$\n"
  FileWrite $R5 "try {$\r$\n"
  FileWrite $R5 "  Invoke-WebRequest -Uri '$runtimeUrl' -OutFile (Join-Path $$dir 'electron-runtime.part') -UseBasicParsing$\r$\n"
  FileWrite $R5 "} catch {$\r$\n"
  FileWrite $R5 "  exit 1$\r$\n"
  FileWrite $R5 "}$\r$\n"
  FileClose $R5
FunctionEnd

Function WaitDownload
  ${Do}
    System::Call 'kernel32::GetExitCodeProcess(p $runtimeHandle, *i .R1)'
    ${If} $progressBar != 0
      StrCpy $R2 0
      ${If} ${FileExists} "$runtimePart"
        System::Call 'kernel32::CreateFileW(w "$runtimePart", i 0x80000000, i 1, p 0, i 3, i 0x80, p 0) p.R3'
        ${If} $R3 != -1
          System::Call 'kernel32::GetFileSize(p R3, p 0) i.R2'
          System::Call 'kernel32::CloseHandle(p R3)'
        ${EndIf}
      ${EndIf}
      IntOp $R4 $R2 / 1048576
      IntOp $R5 $R4 * 88
      IntOp $R5 $R5 / ${RUNTIME_MB}
      ${If} $R5 > 88
        StrCpy $R5 88
      ${EndIf}
      SendMessage $progressBar ${PBM_SETPOS} $R5 0
      IntOp $R6 $R5 / 10
      IntOp $R7 $lastPercent / 10
      ${If} $R6 != $R7
        DetailPrint "$(L_DL_PROGRESS)$R5%"
        StrCpy $lastPercent $R5
      ${EndIf}
    ${EndIf}
    ${If} $R1 != 259
      StrCpy $runtimeExit $R1
      ${ExitDo}
    ${EndIf}
    Sleep 150
  ${Loop}
  System::Call 'kernel32::CloseHandle(p $runtimeHandle)'
  ${If} $runtimeThread != 0
    System::Call 'kernel32::CloseHandle(p $runtimeThread)'
  ${EndIf}
  StrCpy $runtimeHandle 0
FunctionEnd

Function VerifyRuntimeFile
  StrCpy $downloadOk 0
  StrCpy $R6 "electron-runtime.part"
  ${IfNot} ${FileExists} "$runtimePart"
    StrCpy $R6 "electron-v${RUNTIME_TAG}-win32-x64.zip"
  ${EndIf}
  ${IfNot} ${FileExists} "$runtimeDir\$R6"
    Return
  ${EndIf}

  Delete "$runtimeDir\sha.ok"
  FileOpen $R1 "$runtimeDir\sha.ps1" w
  FileWrite $R1 "$$ErrorActionPreference = 'Stop'$\r$\n"
  FileWrite $R1 "$$dir = Split-Path -Parent $$MyInvocation.MyCommand.Path$\r$\n"
  FileWrite $R1 "try {$\r$\n"
  FileWrite $R1 "  $$h = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $$dir '$R6')).Hash$\r$\n"
  FileWrite $R1 "  if ($$h -eq '${RUNTIME_SHA256}') { Set-Content -LiteralPath (Join-Path $$dir 'sha.ok') -Value 'OK' -NoNewline -Encoding ASCII } else { Set-Content -LiteralPath (Join-Path $$dir 'sha.ok') -Value 'BAD' -NoNewline -Encoding ASCII }$\r$\n"
  FileWrite $R1 "} catch {$\r$\n"
  FileWrite $R1 "  Set-Content -LiteralPath (Join-Path $$dir 'sha.ok') -Value 'ERR' -NoNewline -Encoding ASCII$\r$\n"
  FileWrite $R1 "}$\r$\n"
  FileClose $R1

  nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$runtimeDir\sha.ps1"'
  Pop $R2
  Pop $R3
  FileOpen $R4 "$runtimeDir\sha.ok" r
  ${If} $R4 != ""
    FileRead $R4 $R5
    FileClose $R4
    ${If} $R5 == "OK"
      StrCpy $downloadOk 1
    ${EndIf}
  ${EndIf}
  Delete "$runtimeDir\sha.ok"
  Delete "$runtimeDir\sha.ps1"
  Delete "$runtimeDir\dl.ps1"
FunctionEnd

Function ExtractionPhase
  DetailPrint "$(L_EXTRACT)"
  ${If} $progressBar != 0
    SendMessage $progressBar ${PBM_SETPOS} 94 0
  ${EndIf}

  nsisunz::UnzipToLog "$runtimeZip" "$INSTDIR"
  Pop $R0
  ${If} $R0 != "success"
    StrCpy $installFailed 1
    StrCpy $installError "$(L_ERR_EXTRACT)"
    Return
  ${EndIf}

  Delete "$INSTDIR\${APP_EXE}"
  Rename "$INSTDIR\electron.exe" "$INSTDIR\${APP_EXE}"
  Delete "$INSTDIR\default_app.asar"
  ${IfNot} ${FileExists} "$INSTDIR\${APP_EXE}"
    StrCpy $installFailed 1
    StrCpy $installError "$(L_ERR_EXTRACT)"
    Return
  ${EndIf}

  FindFirst $R1 $R2 "$INSTDIR\locales\*.pak"
  ${Do}
    ${If} $R2 == ""
      ${ExitDo}
    ${EndIf}
    ${If} $R2 != "en-US.pak"
    ${AndIf} $R2 != "ru.pak"
      Delete "$INSTDIR\locales\$R2"
    ${EndIf}
    FindNext $R1 $R2
  ${Loop}
  FindClose $R1

  DetailPrint "$(L_PREPARE)"
  File /oname=$PLUGINSDIR\app.ico "${INSTALLER_ICON}"
!if "${RCEDIT_EXE}" != ""
  File /oname=$PLUGINSDIR\rcedit.exe "${RCEDIT_EXE}"
  nsExec::ExecToStack '"$PLUGINSDIR\rcedit.exe" "$INSTDIR\${APP_EXE}" --set-icon "$PLUGINSDIR\app.ico" --set-file-version "${APP_VERSION}" --set-product-version "${APP_VERSION}" --set-version-string "ProductName" "CloseCode" --set-version-string "FileDescription" "CloseCode" --set-version-string "CompanyName" "CloseCode"'
  Pop $R0
  Pop $R1
!endif
FunctionEnd

!endif
