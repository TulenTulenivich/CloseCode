; CloseCode custom setup: a terminal-style window instead of the stock NSIS wizard.
; Compiled by scripts/build-installer.mjs. The payload list is generated into
; payload.loader.nsh / payload.offline.nsh; define PROTO to compile the UI
; without payload. WEB_INSTALL builds the thin loader that fetches the pinned
; Electron runtime archive instead of embedding it.

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

Name "Setup"
OutFile "${OUT_FILE}"
Icon "${INSTALLER_ICON}"
UninstallIcon "${INSTALLER_ICON}"
InstallDir "$LOCALAPPDATA\Programs\CloseCode"
ShowInstDetails nevershow
ShowUninstDetails nevershow

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

!include "nsDialogs.nsh"
!include "WinMessages.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"

!addplugindir /x86-unicode "${__FILEDIR__}\plugins\x86-unicode"

; ---------------------------------------------------------------- theme

!define W 720
!define H 470

!define C_BG 0x0d0b0b
!define C_CHROME 0x110e0e
!define C_CARD 0x141010
!define C_LINE 0x2b2626
!define C_LINE_SOFT 0x201b1b
!define C_TEXT 0xe3e8e8
!define C_TEXT_SOFT 0xc0b9b9
!define C_MUTED 0x948b8b
!define C_DIM 0x665d5d
!define C_ACCENT 0x6be8b9
!define C_ACCENT_HOVER 0x9bf7d3
!define C_ACCENT_SOFT 0x12241a
!define C_ACCENT_DIM 0x3d8f6f
!define C_DANGER 0x575fff
!define C_DOT_R 0x575fff
!define C_DOT_Y 0x2ebcfe
!define C_DOT_G 0x40c828

!macro LoadFont FONT SIZE WEIGHT FACE
  System::Call 'gdi32::CreateFont(i ${SIZE}, i 0, i 0, i 0, i ${WEIGHT}, i 0, i 0, i 0, i 1, i 0, i 0, i 5, i 0, t "${FACE}") p.R0'
  StrCpy ${FONT} $R0
!macroend

!macro UiPos HANDLE X Y WW HH
  System::Call 'user32::MoveWindow(p ${HANDLE}, i ${X}, i ${Y}, i ${WW}, i ${HH}, i 0)'
!macroend

!macro UiLabel HANDLE TEXT X Y WW HH FONT COLOR
  ${NSD_CreateLabel} 0 0 0 0 "${TEXT}"
  Pop ${HANDLE}
  !insertmacro UiPos ${HANDLE} ${X} ${Y} ${WW} ${HH}
  SendMessage ${HANDLE} ${WM_SETFONT} ${FONT} 1
  SetCtlColors ${HANDLE} ${COLOR} "transparent"
!macroend

; nsDialogs creates labels with WS_EX_TRANSPARENT and stacks each new control
; at the bottom of the z-order. Opaque layers make the stack paint itself, but
; only if every control is raised as it is created, so creation order becomes
; the painting order.
!macro UiLabelBg HANDLE TEXT X Y WW HH FONT COLOR BG
  ${NSD_CreateLabel} 0 0 0 0 "${TEXT}"
  Pop ${HANDLE}
  !insertmacro UiPos ${HANDLE} ${X} ${Y} ${WW} ${HH}
  SendMessage ${HANDLE} ${WM_SETFONT} ${FONT} 1
  System::Call 'user32::GetWindowLong(p ${HANDLE}, i -20) i.R9'
  IntOp $R9 $R9 & 0xFFFFFFDF
  System::Call 'user32::SetWindowLong(p ${HANDLE}, i -20, i $R9)'
  System::Call 'user32::SetWindowPos(p ${HANDLE}, p 0, i 0, i 0, i 0, i 0, i 0x0013)'
  SetCtlColors ${HANDLE} ${COLOR} ${BG}
!macroend

!macro UiStyle HANDLE STYLE
  System::Call 'user32::GetWindowLong(p ${HANDLE}, i -16) i.R9'
  IntOp $R9 $R9 | ${STYLE}
  System::Call 'user32::SetWindowLong(p ${HANDLE}, i -16, i $R9)'
!macroend
!macro UiRound HANDLE WW HH RADIUS
  System::Call 'gdi32::CreateRoundRectRgn(i 0, i 0, i ${WW}, i ${HH}, i ${RADIUS}, i ${RADIUS}) p.R9'
  System::Call 'user32::SetWindowRgn(p ${HANDLE}, p $R9, i 1)'
!macroend

!macro UiHover HANDLE
  System::Call 'user32::InvalidateRect(p ${HANDLE}, p 0, i 1)'
!macroend

!macro UiProgressBar
  !insertmacro UiLabelBg $hBar "" 30 318 600 6 $fTiny ${C_BG} ${C_LINE_SOFT}
  !insertmacro UiLabelBg $hBarFill "" 30 318 0 6 $fTiny ${C_BG} ${C_ACCENT}
!macroend

!macro UiBarSet PERCENT
  StrCpy $R7 ${PERCENT}
  IntOp $R7 $R7 * 600
  IntOp $R7 $R7 / 100
  !insertmacro UiPos $hBarFill 30 318 $R7 6
  !insertmacro UiHover $hBarFill
!macroend

; A flat prompt tile instead of a brand bitmap: the window chrome already
; carries the dots, so the hero only needs a terminal mark and a plain name.
!macro UiHero TAG
  !insertmacro UiLabelBg $hLogo "" 30 58 48 48 $fTiny ${C_BG} ${C_CARD}
  !insertmacro UiRound $hLogo 48 48 14
  !insertmacro UiLabelBg $hLogoGlyph ">_" 30 69 48 24 $fHead ${C_ACCENT} ${C_CARD}
  !insertmacro UiStyle $hLogoGlyph 0x1
  !insertmacro UiLabelBg $hWord "$(L_HERO)" 94 54 300 34 $fHead ${C_TEXT} ${C_BG}
  !insertmacro UiLabelBg $hTagPrompt "❯" 96 94 16 16 $fSmall ${C_ACCENT} ${C_BG}
  !insertmacro UiLabelBg $hTag "${TAG}" 112 94 360 16 $fSmall ${C_MUTED} ${C_BG}
  !insertmacro UiLabelBg $hVersion "v${APP_VERSION}" 590 60 100 16 $fTiny ${C_DIM} ${C_BG}
  !insertmacro UiStyle $hVersion 0x2
  !insertmacro UiLabelBg $hDivider1 "" 30 142 660 1 $fTiny ${C_BG} ${C_LINE}
!macroend


; ---------------------------------------------------------------- language

LoadLanguageFile "${NSISDIR}\Contrib\Language files\English.nlf"
LoadLanguageFile "${NSISDIR}\Contrib\Language files\Russian.nlf"

LangString L_CHIP ${LANG_ENGLISH} "setup"
LangString L_CHIP ${LANG_RUSSIAN} "setup"
LangString L_TAG ${LANG_ENGLISH} "desktop agent"
LangString L_TAG ${LANG_RUSSIAN} "desktop agent"
LangString L_SEC_OPT ${LANG_ENGLISH} "installation"
LangString L_SEC_OPT ${LANG_RUSSIAN} "установка"
LangString L_DEST ${LANG_ENGLISH} "INSTALL FOLDER"
LangString L_DEST ${LANG_RUSSIAN} "ПАПКА НАЗНАЧЕНИЯ"
LangString L_CHANGE ${LANG_ENGLISH} "change"
LangString L_CHANGE ${LANG_RUSSIAN} "изменить"
LangString L_SHORTCUT ${LANG_ENGLISH} "desktop shortcut"
LangString L_SHORTCUT ${LANG_RUSSIAN} "ярлык на рабочем столе"
LangString L_LAUNCH ${LANG_ENGLISH} "launch after installation"
LangString L_LAUNCH ${LANG_RUSSIAN} "запустить после установки"
LangString L_B1 ${LANG_ENGLISH} "API keys are encrypted on this device"
LangString L_B1 ${LANG_RUSSIAN} "ключи API шифруются на этом устройстве"
LangString L_B2 ${LANG_ENGLISH} "project files stay on your PC"
LangString L_B2 ${LANG_RUSSIAN} "файлы проекта остаются на вашем ПК"
LangString L_B3 ${LANG_ENGLISH} "requests go straight to the provider"
LangString L_B3 ${LANG_RUSSIAN} "запросы идут напрямую к провайдеру"
!ifdef WEB_INSTALL
LangString L_NOTE ${LANG_ENGLISH} "~${RUNTIME_MB} MB download · ~${INSTALL_MB} MB on disk"
LangString L_NOTE ${LANG_RUSSIAN} "~${RUNTIME_MB} МБ загрузка · ~${INSTALL_MB} МБ на диске"
!else
LangString L_NOTE ${LANG_ENGLISH} "~${INSTALL_MB} MB · installs for the current user"
LangString L_NOTE ${LANG_RUSSIAN} "~${INSTALL_MB} МБ · установка для текущего пользователя"
!endif
LangString L_HERO ${LANG_ENGLISH} "workspace"
LangString L_HERO ${LANG_RUSSIAN} "рабочая область"
LangString L_CHROME_INSTALL ${LANG_ENGLISH} "installer"
LangString L_CHROME_INSTALL ${LANG_RUSSIAN} "установщик"
LangString L_CHROME_UNINSTALL ${LANG_ENGLISH} "uninstaller"
LangString L_CHROME_UNINSTALL ${LANG_RUSSIAN} "удаление"
LangString L_BTN_INSTALL ${LANG_ENGLISH} "install"
LangString L_BTN_INSTALL ${LANG_RUSSIAN} "установить"
LangString L_BTN_CANCEL ${LANG_ENGLISH} "cancel"
LangString L_BTN_CANCEL ${LANG_RUSSIAN} "отмена"
LangString L_BTN_RUN ${LANG_ENGLISH} "launch"
LangString L_BTN_RUN ${LANG_RUSSIAN} "запустить"
LangString L_BTN_CLOSE ${LANG_ENGLISH} "close"
LangString L_BTN_CLOSE ${LANG_RUSSIAN} "закрыть"
LangString L_FOOT ${LANG_ENGLISH} "❯ esc — close setup"
LangString L_FOOT ${LANG_RUSSIAN} "❯ esc — закрыть установщик"
LangString L_FOOT_DONE ${LANG_ENGLISH} "❯ ready to go"
LangString L_FOOT_DONE ${LANG_RUSSIAN} "❯ всё готово"
LangString L_BUSY ${LANG_ENGLISH} "❯ installing, do not close this window"
LangString L_BUSY ${LANG_RUSSIAN} "❯ идёт установка, не закрывайте окно"
LangString L_SEC_PROG ${LANG_ENGLISH} "unpacking"
LangString L_SEC_PROG ${LANG_RUSSIAN} "распаковка"
LangString L_SEC_DOWNLOAD ${LANG_ENGLISH} "downloading components"
LangString L_SEC_DOWNLOAD ${LANG_RUSSIAN} "скачиваю компоненты"
LangString L_SEC_VERIFY ${LANG_ENGLISH} "verifying download"
LangString L_SEC_VERIFY ${LANG_RUSSIAN} "проверяю загрузку"
LangString L_SEC_EXTRACT ${LANG_ENGLISH} "unpacking components"
LangString L_SEC_EXTRACT ${LANG_RUSSIAN} "распаковываю компоненты"
LangString L_SEC_DONE ${LANG_ENGLISH} "done"
LangString L_SEC_DONE ${LANG_RUSSIAN} "готово"
LangString L_DONE_BODY ${LANG_ENGLISH} "Everything is set up."
LangString L_DONE_BODY ${LANG_RUSSIAN} "Всё готово."
LangString L_DONE_HINT ${LANG_ENGLISH} "a shortcut was added to the Start menu"
LangString L_DONE_HINT ${LANG_RUSSIAN} "ярлык добавлен в меню «Пуск»"
LangString L_OF ${LANG_ENGLISH} "of"
LangString L_OF ${LANG_RUSSIAN} "из"
LangString L_FILES ${LANG_ENGLISH} "files"
LangString L_FILES ${LANG_RUSSIAN} "файлов"
LangString L_LOG_CLOSE ${LANG_ENGLISH} "closing running copies"
LangString L_LOG_CLOSE ${LANG_RUSSIAN} "закрываю запущенные копии"
LangString L_LOG_OLD ${LANG_ENGLISH} "removing the previous version"
LangString L_LOG_OLD ${LANG_RUSSIAN} "удаляю предыдущую версию"
LangString L_LOG_FILES ${LANG_ENGLISH} "unpacking application files"
LangString L_LOG_FILES ${LANG_RUSSIAN} "распаковываю файлы приложения"
LangString L_LOG_UNINST ${LANG_ENGLISH} "preparing the uninstaller"
LangString L_LOG_UNINST ${LANG_RUSSIAN} "готовлю удаление"
LangString L_LOG_LINKS ${LANG_ENGLISH} "creating shortcuts"
LangString L_LOG_LINKS ${LANG_RUSSIAN} "создаю ярлыки"
LangString L_LOG_REG ${LANG_ENGLISH} "registering the application"
LangString L_LOG_REG ${LANG_RUSSIAN} "регистрирую приложение"
LangString L_LOG_DONE ${LANG_ENGLISH} "installation complete"
LangString L_LOG_DONE ${LANG_RUSSIAN} "установка завершена"
LangString L_LOG_DOWNLOAD ${LANG_ENGLISH} "downloading the runtime"
LangString L_LOG_DOWNLOAD ${LANG_RUSSIAN} "скачиваю движок"
LangString L_LOG_VERIFY ${LANG_ENGLISH} "checking the download"
LangString L_LOG_VERIFY ${LANG_RUSSIAN} "проверяю загрузку"
LangString L_LOG_EXTRACT ${LANG_ENGLISH} "unpacking the runtime"
LangString L_LOG_EXTRACT ${LANG_RUSSIAN} "распаковываю движок"
LangString L_LOG_PREPARE ${LANG_ENGLISH} "preparing the app"
LangString L_LOG_PREPARE ${LANG_RUSSIAN} "готовлю приложение"
LangString L_ERR_DIR ${LANG_ENGLISH} "❯ cannot create this folder, choose another one"
LangString L_ERR_DIR ${LANG_RUSSIAN} "❯ не удалось создать папку, выберите другую"
LangString L_ERR_DOWNLOAD ${LANG_ENGLISH} "❯ download failed, check the connection and try again"
LangString L_ERR_DOWNLOAD ${LANG_RUSSIAN} "❯ не удалось скачать, проверьте подключение и повторите"
LangString L_ERR_CHECKSUM ${LANG_ENGLISH} "❯ the download is damaged, try again"
LangString L_ERR_CHECKSUM ${LANG_RUSSIAN} "❯ загрузка повреждена, повторите"
LangString L_ERR_EXTRACT ${LANG_ENGLISH} "❯ could not unpack the components, try again"
LangString L_ERR_EXTRACT ${LANG_RUSSIAN} "❯ не удалось распаковать компоненты, повторите"
LangString L_PICK ${LANG_ENGLISH} "Choose the CloseCode folder"
LangString L_PICK ${LANG_RUSSIAN} "Выберите папку для CloseCode"

LangString L_CHIP_UN ${LANG_ENGLISH} "uninstall"
LangString L_CHIP_UN ${LANG_RUSSIAN} "uninstall"
LangString L_UN_TAG ${LANG_ENGLISH} "desktop agent · uninstall"
LangString L_UN_TAG ${LANG_RUSSIAN} "desktop agent · uninstall"
LangString L_UN_SEC ${LANG_ENGLISH} "removal"
LangString L_UN_SEC ${LANG_RUSSIAN} "удаление"
LangString L_UN_DATA ${LANG_ENGLISH} "also delete settings and chat history"
LangString L_UN_DATA ${LANG_RUSSIAN} "также удалить настройки и историю чатов"
LangString L_UN_B1 ${LANG_ENGLISH} "app files and shortcuts will be deleted"
LangString L_UN_B1 ${LANG_RUSSIAN} "файлы приложения и ярлыки будут удалены"
LangString L_UN_B2 ${LANG_ENGLISH} "settings stay unless you tick the option above"
LangString L_UN_B2 ${LANG_RUSSIAN} "настройки останутся, если не отметить пункт выше"
LangString L_UN_NOTE ${LANG_ENGLISH} "uninstall removes only the app folder"
LangString L_UN_NOTE ${LANG_RUSSIAN} "удаляется только папка приложения"
LangString L_UN_BUSY ${LANG_ENGLISH} "❯ removing, do not close this window"
LangString L_UN_BUSY ${LANG_RUSSIAN} "❯ идёт удаление, не закрывайте окно"
LangString L_UN_BTN ${LANG_ENGLISH} "remove"
LangString L_UN_BTN ${LANG_RUSSIAN} "удалить"
LangString L_UN_LOG_FILES ${LANG_ENGLISH} "removing application files"
LangString L_UN_LOG_FILES ${LANG_RUSSIAN} "удаляю файлы приложения"
LangString L_UN_LOG_LINKS ${LANG_ENGLISH} "removing shortcuts"
LangString L_UN_LOG_LINKS ${LANG_RUSSIAN} "удаляю ярлыки"
LangString L_UN_LOG_REG ${LANG_ENGLISH} "cleaning the registry"
LangString L_UN_LOG_REG ${LANG_RUSSIAN} "очищаю реестр"
LangString L_UN_LOG_DATA ${LANG_ENGLISH} "deleting settings and history"
LangString L_UN_LOG_DATA ${LANG_RUSSIAN} "удаляю настройки и историю"
LangString L_UN_LOG_KEEP ${LANG_ENGLISH} "settings and history kept"
LangString L_UN_LOG_KEEP ${LANG_RUSSIAN} "настройки и история сохранены"
LangString L_UN_DONE_BODY ${LANG_ENGLISH} "The app has been removed."
LangString L_UN_DONE_BODY ${LANG_RUSSIAN} "Приложение удалено."
LangString L_UN_DONE_HINT ${LANG_ENGLISH} "settings and history were kept"
LangString L_UN_DONE_HINT ${LANG_RUSSIAN} "настройки и история сохранены"
LangString L_UN_DONE_HINT2 ${LANG_ENGLISH} "settings and history were deleted"
LangString L_UN_DONE_HINT2 ${LANG_RUSSIAN} "настройки и история удалены"

; ---------------------------------------------------------------- vars

Var hPage
Var hBorderBg
Var hBg
Var hChrome
Var hChromeLine
Var hDot1
Var hDot2
Var hDot3
Var hTitle
Var hChip
Var hMin
Var hClose
Var hLogo
Var hLogoGlyph
Var hWord
Var hTagPrompt
Var hTag
Var hVersion
Var hDivider1

Var hOptLabel
Var hDestCaption
Var hPathOuter
Var hPathInner
Var hPathText
Var hPathLink
Var hShortPre
Var hShortText
Var hLaunchPre
Var hLaunchText
Var hError
Var hDivider2
Var hBullet1
Var hBullet1Text
Var hBullet2
Var hBullet2Text
Var hBullet3
Var hBullet3Text
Var hNote

Var hProgLabel
Var hProgFile
Var hLog1
Var hLog2
Var hLog3
Var hLog4
Var hBar
Var hBarFill
Var hPct
Var hCount

Var hDoneBadge
Var hDoneCheck
Var hDoneTitle
Var hDoneBody
Var hDonePath
Var hDoneHint

Var hFootLine
Var hFootHint
Var hBtnOuter
Var hBtnText
Var hCancelOuter
Var hCancelInner
Var hCancelText

Var fTiny
Var fSmall
Var fBody
Var fBodyBold
Var fPath
Var fLogo
Var fHead
Var fGlyph
Var fBtn

Var installDir
Var optShortcut
Var optLaunch
Var optData
Var busy
Var state
Var silentMode
Var installedFlag
Var installFailed

Var totalFiles
Var copiedFiles
Var oldDir
Var oldKey
Var oldUninst

Var log1Text
Var log2Text
Var log3Text
Var log4Text

Var installError
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

; ---------------------------------------------------------------- window

Function ApplyRegion
  System::Alloc 16
  Pop $R0
  System::Call 'user32::GetWindowRect(p $HWNDPARENT, p $R0)'
  System::Call '*$R0(i.R1, i.R2, i.R3, i.R4)'
  System::Free $R0
  IntOp $R5 $R3 - $R1
  IntOp $R6 $R4 - $R2
  IntOp $R5 $R5 + 1
  IntOp $R6 $R6 + 1
  System::Call 'gdi32::CreateRoundRectRgn(i 0, i 0, i $R5, i $R6, i 30, i 30) p.R7'
  System::Call 'user32::SetWindowRgn(p $HWNDPARENT, p $R7, i 1)'
FunctionEnd

Function ApplyWindowStyle
  System::Call 'user32::GetWindowLong(p $HWNDPARENT, i -16) i.R0'
  IntOp $R1 $R0 & 0xFF30FFFF
  IntOp $R1 $R1 | 0x02000000
  System::Call 'user32::SetWindowLong(p $HWNDPARENT, i -16, i $R1)'
  System::Call 'user32::SetWindowPos(p $HWNDPARENT, p 0, i 0, i 0, i 0, i 0, i 0x0037)'
  System::Call 'user32::GetSystemMetrics(i 0) i.R2'
  System::Call 'user32::GetSystemMetrics(i 1) i.R3'
  IntOp $R4 $R2 - ${W}
  IntOp $R4 $R4 / 2
  IntOp $R5 $R3 - ${H}
  IntOp $R5 $R5 / 2
  System::Call 'user32::SetWindowPos(p $HWNDPARENT, p 0, i $R4, i $R5, i ${W}, i ${H}, i 0x0004)'
  Call ApplyRegion
FunctionEnd

Function .onGUIInit
  Call ApplyWindowStyle
FunctionEnd

Function HideStockButtons
  GetDlgItem $0 $HWNDPARENT 1
  ShowWindow $0 0
  EnableWindow $0 0
  GetDlgItem $0 $HWNDPARENT 2
  ShowWindow $0 0
  GetDlgItem $0 $HWNDPARENT 3
  ShowWindow $0 0
  EnableWindow $0 0
FunctionEnd

; ---------------------------------------------------------------- page

Function CreateUI
  nsDialogs::Create 1018
  Pop $hPage
  ${If} $hPage == error
    Abort
  ${EndIf}
  !insertmacro UiPos $hPage 0 0 ${W} ${H}
  Call HideStockButtons

  !insertmacro LoadFont $fTiny -11 400 "Consolas"
  !insertmacro LoadFont $fSmall -12 400 "Consolas"
  !insertmacro LoadFont $fBody -14 400 "Consolas"
  !insertmacro LoadFont $fBodyBold -14 700 "Consolas"
  !insertmacro LoadFont $fPath -14 400 "Consolas"
  !insertmacro LoadFont $fLogo -30 700 "Consolas"
  !insertmacro LoadFont $fHead -24 700 "Consolas"
  !insertmacro LoadFont $fGlyph -14 400 "Segoe UI"
  !insertmacro LoadFont $fBtn -14 600 "Consolas"

  ; frame + background
  !insertmacro UiLabelBg $hBorderBg "" 0 0 ${W} ${H} $fTiny ${C_BG} ${C_LINE}
  !insertmacro UiLabelBg $hBg "" 1 1 ${W} 468 $fTiny ${C_BG} ${C_BG}

  ; chrome
  !insertmacro UiLabelBg $hChrome "" 1 1 718 39 $fTiny ${C_BG} ${C_CHROME}
  !insertmacro UiLabelBg $hChromeLine "" 1 40 718 1 $fTiny ${C_BG} ${C_LINE}
  !insertmacro UiLabelBg $hDot1 "●" 18 14 12 12 $fGlyph ${C_DOT_R} ${C_CHROME}
  !insertmacro UiLabelBg $hDot2 "●" 32 14 12 12 $fGlyph ${C_DOT_Y} ${C_CHROME}
  !insertmacro UiLabelBg $hDot3 "●" 46 14 12 12 $fGlyph ${C_DOT_G} ${C_CHROME}
  !insertmacro UiLabelBg $hTitle "$(L_CHROME_INSTALL)" 66 12 90 16 $fSmall ${C_MUTED} ${C_CHROME}
  !insertmacro UiLabelBg $hChip "$(L_CHIP)" 146 12 52 16 $fTiny ${C_ACCENT} ${C_ACCENT_SOFT}
  !insertmacro UiStyle $hChip 0x1
  !insertmacro UiLabelBg $hMin "–" 646 9 26 22 $fGlyph ${C_MUTED} ${C_CHROME}
  !insertmacro UiStyle $hMin 0x101
  !insertmacro UiLabelBg $hClose "✕" 676 9 26 22 $fGlyph ${C_MUTED} ${C_CHROME}
  !insertmacro UiStyle $hClose 0x101

  ; hero
  !insertmacro UiHero "$(L_TAG) · $(L_CHIP)"

  ; options
  !insertmacro UiLabelBg $hOptLabel "❯ $(L_SEC_OPT)" 30 158 300 18 $fSmall ${C_ACCENT} ${C_BG}
  !insertmacro UiLabelBg $hDestCaption "$(L_DEST)" 30 186 300 14 $fTiny ${C_MUTED} ${C_BG}
  !insertmacro UiLabelBg $hPathOuter "" 30 204 660 38 $fTiny ${C_BG} ${C_LINE}
  !insertmacro UiStyle $hPathOuter ${SS_NOTIFY}
  !insertmacro UiLabelBg $hPathInner "" 31 205 658 36 $fTiny ${C_BG} ${C_CARD}
  !insertmacro UiStyle $hPathInner ${SS_NOTIFY}
  !insertmacro UiLabelBg $hPathText "$INSTDIR" 46 214 520 20 $fPath ${C_TEXT_SOFT} ${C_CARD}
  !insertmacro UiStyle $hPathText 0x8000
  !insertmacro UiLabelBg $hPathLink "$(L_CHANGE)" 606 214 70 20 $fSmall ${C_ACCENT} ${C_CARD}
  !insertmacro UiStyle $hPathLink 0x102

  !insertmacro UiLabelBg $hShortPre "[x]" 30 256 26 18 $fBody ${C_ACCENT} ${C_BG}
  !insertmacro UiStyle $hShortPre ${SS_NOTIFY}
  !insertmacro UiLabelBg $hShortText "$(L_SHORTCUT)" 58 256 340 18 $fBody ${C_TEXT_SOFT} ${C_BG}
  !insertmacro UiStyle $hShortText ${SS_NOTIFY}
  !insertmacro UiLabelBg $hLaunchPre "[x]" 30 282 26 18 $fBody ${C_ACCENT} ${C_BG}
  !insertmacro UiStyle $hLaunchPre ${SS_NOTIFY}
  !insertmacro UiLabelBg $hLaunchText "$(L_LAUNCH)" 58 282 340 18 $fBody ${C_TEXT_SOFT} ${C_BG}
  !insertmacro UiStyle $hLaunchText ${SS_NOTIFY}
  !insertmacro UiLabelBg $hError "$(L_ERR_DIR)" 30 300 600 16 $fSmall ${C_DANGER} ${C_BG}
  ShowWindow $hError 0

  !insertmacro UiLabelBg $hDivider2 "" 30 322 660 1 $fTiny ${C_BG} ${C_LINE_SOFT}
  !insertmacro UiLabelBg $hBullet1 "›" 30 336 14 16 $fSmall ${C_ACCENT_DIM} ${C_BG}
  !insertmacro UiLabelBg $hBullet1Text "$(L_B1)" 46 336 600 16 $fSmall ${C_MUTED} ${C_BG}
  !insertmacro UiLabelBg $hBullet2 "›" 30 356 14 16 $fSmall ${C_ACCENT_DIM} ${C_BG}
  !insertmacro UiLabelBg $hBullet2Text "$(L_B2)" 46 356 600 16 $fSmall ${C_MUTED} ${C_BG}
  !insertmacro UiLabelBg $hBullet3 "›" 30 376 14 16 $fSmall ${C_ACCENT_DIM} ${C_BG}
  !insertmacro UiLabelBg $hBullet3Text "$(L_B3)" 46 376 600 16 $fSmall ${C_MUTED} ${C_BG}
  !insertmacro UiLabelBg $hNote "$(L_NOTE)" 30 396 600 14 $fTiny ${C_DIM} ${C_BG}

  ; progress
  !insertmacro UiLabelBg $hProgLabel "❯ $(L_SEC_PROG)" 30 158 300 18 $fSmall ${C_ACCENT} ${C_BG}
  !insertmacro UiLabelBg $hProgFile "→" 30 186 640 20 $fPath ${C_TEXT} ${C_BG}
  !insertmacro UiStyle $hProgFile 0x4000
  !insertmacro UiLabelBg $hLog1 "" 30 220 640 18 $fSmall ${C_DIM} ${C_BG}
  !insertmacro UiLabelBg $hLog2 "" 30 240 640 18 $fSmall ${C_DIM} ${C_BG}
  !insertmacro UiLabelBg $hLog3 "" 30 260 640 18 $fSmall ${C_DIM} ${C_BG}
  !insertmacro UiLabelBg $hLog4 "" 30 280 640 18 $fSmall ${C_MUTED} ${C_BG}
  ${NSD_CreateProgressBar} 0 0 0 0 ""
  Pop $hBar
  !insertmacro UiProgressBar
  !insertmacro UiLabelBg $hPct "0%" 640 306 50 22 $fBodyBold ${C_ACCENT} ${C_BG}
  !insertmacro UiStyle $hPct 0x2
  !insertmacro UiLabelBg $hCount "" 30 332 600 16 $fTiny ${C_MUTED} ${C_BG}

  ; done
  !insertmacro UiLabelBg $hDoneBadge "" 30 166 44 44 $fTiny ${C_BG} ${C_ACCENT}
  !insertmacro UiRound $hDoneBadge 44 44 16
  !insertmacro UiLabelBg $hDoneCheck "✓" 30 175 44 28 $fHead ${C_BG} ${C_ACCENT}
  !insertmacro UiStyle $hDoneCheck 0x1
  !insertmacro UiLabelBg $hDoneTitle "$(L_SEC_DONE)" 90 164 400 34 $fHead ${C_TEXT} ${C_BG}
  !insertmacro UiLabelBg $hDoneBody "$(L_DONE_BODY)" 90 204 500 20 $fBody ${C_MUTED} ${C_BG}
  !insertmacro UiLabelBg $hDonePath "" 30 250 640 18 $fSmall ${C_DIM} ${C_BG}
  !insertmacro UiStyle $hDonePath 0x8000
  !insertmacro UiLabelBg $hDoneHint "› $(L_DONE_HINT)" 30 286 620 18 $fSmall ${C_MUTED} ${C_BG}

  ; footer
  !insertmacro UiLabelBg $hFootLine "" 30 406 660 1 $fTiny ${C_BG} ${C_LINE}
  !insertmacro UiLabelBg $hFootHint "$(L_FOOT)" 30 422 380 16 $fTiny ${C_MUTED} ${C_BG}
  !insertmacro UiLabelBg $hCancelOuter "" 432 414 96 34 $fTiny ${C_BG} ${C_LINE}
  !insertmacro UiStyle $hCancelOuter ${SS_NOTIFY}
  !insertmacro UiRound $hCancelOuter 96 34 12
  !insertmacro UiLabelBg $hCancelInner "" 433 415 94 32 $fTiny ${C_BG} ${C_BG}
  !insertmacro UiStyle $hCancelInner ${SS_NOTIFY}
  !insertmacro UiRound $hCancelInner 94 32 12
  !insertmacro UiLabelBg $hCancelText "$(L_BTN_CANCEL)" 432 422 96 18 $fBtn ${C_MUTED} ${C_BG}
  !insertmacro UiStyle $hCancelText 0x101
  !insertmacro UiLabelBg $hBtnOuter "" 540 414 150 34 $fTiny ${C_BG} ${C_ACCENT}
  !insertmacro UiStyle $hBtnOuter ${SS_NOTIFY}
  !insertmacro UiRound $hBtnOuter 150 34 12
  !insertmacro UiLabelBg $hBtnText "$(L_BTN_INSTALL)" 540 422 150 18 $fBtn ${C_BG} ${C_ACCENT}
  !insertmacro UiStyle $hBtnText 0x101

  Call ShowOptions
  Call RefreshOptions

  ${NSD_OnClick} $hBtnOuter OnPrimary
  ${NSD_OnClick} $hBtnText OnPrimary
  ${NSD_OnClick} $hCancelOuter OnCancel
  ${NSD_OnClick} $hCancelInner OnCancel
  ${NSD_OnClick} $hCancelText OnCancel
  ${NSD_OnClick} $hPathOuter OnBrowse
  ${NSD_OnClick} $hPathInner OnBrowse
  ${NSD_OnClick} $hPathText OnBrowse
  ${NSD_OnClick} $hPathLink OnBrowse
  ${NSD_OnClick} $hShortPre OnToggleShortcut
  ${NSD_OnClick} $hShortText OnToggleShortcut
  ${NSD_OnClick} $hLaunchPre OnToggleLaunch
  ${NSD_OnClick} $hLaunchText OnToggleLaunch
  ${NSD_OnClick} $hMin OnMinimize
  ${NSD_OnClick} $hClose OnClose
  ${NSD_OnClick} $hChrome OnDrag
  ${NSD_OnClick} $hChromeLine OnDrag
  ${NSD_OnClick} $hTitle OnDrag
  ${NSD_OnClick} $hDot1 OnDrag
  ${NSD_OnClick} $hDot2 OnDrag
  ${NSD_OnClick} $hDot3 OnDrag
  nsDialogs::Show
FunctionEnd

Function RefreshOptions
  ${NSD_SetText} $hPathText "$installDir"
  ${If} $optShortcut == 1
    ${NSD_SetText} $hShortPre "[x]"
    SetCtlColors $hShortPre ${C_ACCENT} ${C_BG}
  ${Else}
    ${NSD_SetText} $hShortPre "[ ]"
    SetCtlColors $hShortPre ${C_DIM} ${C_BG}
  ${EndIf}
  ${If} $optLaunch == 1
    ${NSD_SetText} $hLaunchPre "[x]"
    SetCtlColors $hLaunchPre ${C_ACCENT} ${C_BG}
  ${Else}
    ${NSD_SetText} $hLaunchPre "[ ]"
    SetCtlColors $hLaunchPre ${C_DIM} ${C_BG}
  ${EndIf}
  !insertmacro UiHover $hShortPre
  !insertmacro UiHover $hLaunchPre
FunctionEnd

; Hiding or showing NSD labels uncovers the stock dialog brush, so every
; state switch has to repaint the page and all of its children.
Function RepaintPage
  System::Call 'user32::RedrawWindow(p $hPage, p 0, p 0, i 0x0185)'
FunctionEnd

Function ShowOptions
  StrCpy $state "options"
  ShowWindow $hOptLabel 1
  ShowWindow $hDestCaption 1
  ShowWindow $hPathOuter 1
  ShowWindow $hPathInner 1
  ShowWindow $hPathText 1
  ShowWindow $hPathLink 1
  ShowWindow $hShortPre 1
  ShowWindow $hShortText 1
  ShowWindow $hLaunchPre 1
  ShowWindow $hLaunchText 1
  ShowWindow $hDivider2 1
  ShowWindow $hBullet1 1
  ShowWindow $hBullet1Text 1
  ShowWindow $hBullet2 1
  ShowWindow $hBullet2Text 1
  ShowWindow $hBullet3 1
  ShowWindow $hBullet3Text 1
  ShowWindow $hNote 1
  ShowWindow $hProgLabel 0
  ShowWindow $hProgFile 0
  ShowWindow $hLog1 0
  ShowWindow $hLog2 0
  ShowWindow $hLog3 0
  ShowWindow $hLog4 0
  ShowWindow $hBar 0
  ShowWindow $hBarFill 0
  ShowWindow $hPct 0
  ShowWindow $hCount 0
  ShowWindow $hDoneBadge 0
  ShowWindow $hDoneCheck 0
  ShowWindow $hDoneTitle 0
  ShowWindow $hDoneBody 0
  ShowWindow $hDonePath 0
  ShowWindow $hDoneHint 0
  ShowWindow $hCancelOuter 1
  ShowWindow $hCancelInner 1
  ShowWindow $hCancelText 1
  ShowWindow $hBtnOuter 1
  ShowWindow $hBtnText 1
  ${NSD_SetText} $hBtnText "$(L_BTN_INSTALL)"
  SetCtlColors $hBtnOuter ${C_BG} ${C_ACCENT}
  SetCtlColors $hBtnText ${C_BG} ${C_ACCENT}
  ${NSD_SetText} $hFootHint "$(L_FOOT)"
  SetCtlColors $hFootHint ${C_MUTED} ${C_BG}
  Call RepaintPage
FunctionEnd

Function ShowProgressState
  StrCpy $state "progress"
  ShowWindow $hOptLabel 0
  ShowWindow $hDestCaption 0
  ShowWindow $hPathOuter 0
  ShowWindow $hPathInner 0
  ShowWindow $hPathText 0
  ShowWindow $hPathLink 0
  ShowWindow $hShortPre 0
  ShowWindow $hShortText 0
  ShowWindow $hLaunchPre 0
  ShowWindow $hLaunchText 0
  ShowWindow $hError 0
  ShowWindow $hDivider2 0
  ShowWindow $hBullet1 0
  ShowWindow $hBullet1Text 0
  ShowWindow $hBullet2 0
  ShowWindow $hBullet2Text 0
  ShowWindow $hBullet3 0
  ShowWindow $hBullet3Text 0
  ShowWindow $hNote 0
  ShowWindow $hDoneBadge 0
  ShowWindow $hDoneCheck 0
  ShowWindow $hDoneTitle 0
  ShowWindow $hDoneBody 0
  ShowWindow $hDonePath 0
  ShowWindow $hDoneHint 0
  ShowWindow $hCancelOuter 0
  ShowWindow $hCancelInner 0
  ShowWindow $hCancelText 0
  ShowWindow $hBtnOuter 0
  ShowWindow $hBtnText 0
  ShowWindow $hProgLabel 1
  ShowWindow $hProgFile 1
  ShowWindow $hLog1 1
  ShowWindow $hLog2 1
  ShowWindow $hLog3 1
  ShowWindow $hLog4 1
  ShowWindow $hBar 1
  ShowWindow $hBarFill 1
  ShowWindow $hPct 1
  ShowWindow $hCount 1
  StrCpy $log1Text ""
  StrCpy $log2Text ""
  StrCpy $log3Text ""
  StrCpy $log4Text ""
  ${NSD_SetText} $hLog1 ""
  ${NSD_SetText} $hLog2 ""
  ${NSD_SetText} $hLog3 ""
  ${NSD_SetText} $hLog4 ""
  ${NSD_SetText} $hProgFile "→"
  ${NSD_SetText} $hPct "0%"
  !insertmacro UiBarSet 0
  StrCpy $copiedFiles 0
  ${NSD_SetText} $hCount "0 $(L_OF) $totalFiles $(L_FILES)"
  ${NSD_SetText} $hFootHint "$(L_BUSY)"
  SetCtlColors $hFootHint ${C_ACCENT_DIM} ${C_BG}
  Call RepaintPage
FunctionEnd

Function ShowDoneState
  StrCpy $state "done"
  ShowWindow $hProgLabel 0
  ShowWindow $hProgFile 0
  ShowWindow $hLog1 0
  ShowWindow $hLog2 0
  ShowWindow $hLog3 0
  ShowWindow $hLog4 0
  ShowWindow $hBar 0
  ShowWindow $hBarFill 0
  ShowWindow $hPct 0
  ShowWindow $hCount 0
  ShowWindow $hDoneBadge 1
  ShowWindow $hDoneCheck 1
  ShowWindow $hDoneTitle 1
  ShowWindow $hDoneBody 1
  ShowWindow $hDonePath 1
  ShowWindow $hDoneHint 1
  ShowWindow $hCancelOuter 0
  ShowWindow $hCancelInner 0
  ShowWindow $hCancelText 0
  ShowWindow $hBtnOuter 1
  ShowWindow $hBtnText 1
  ${If} $optLaunch == 1
    ${NSD_SetText} $hBtnText "$(L_BTN_RUN)"
  ${Else}
    ${NSD_SetText} $hBtnText "$(L_BTN_CLOSE)"
  ${EndIf}
  ${NSD_SetText} $hDonePath "→ $installDir"
  ${NSD_SetText} $hFootHint "$(L_FOOT_DONE)"
  SetCtlColors $hFootHint ${C_MUTED} ${C_BG}
  Call RepaintPage
FunctionEnd

Function AppendLog
  ${If} $silentMode == 1
    Return
  ${EndIf}
  StrCpy $log1Text $log2Text
  StrCpy $log2Text $log3Text
  StrCpy $log3Text $log4Text
  StrCpy $log4Text "» $R8"
  ${NSD_SetText} $hLog1 "$log1Text"
  ${NSD_SetText} $hLog2 "$log2Text"
  ${NSD_SetText} $hLog3 "$log3Text"
  ${NSD_SetText} $hLog4 "$log4Text"
  System::Call 'user32::UpdateWindow(p $hPage)'
FunctionEnd

Function StepBegin
  ${If} $silentMode == 1
    Return
  ${EndIf}
  ${NSD_SetText} $hProgFile "→ $R8"
  System::Call 'user32::UpdateWindow(p $hPage)'
FunctionEnd

Function StepDone
  ${If} $silentMode == 1
    Return
  ${EndIf}
  !insertmacro UiBarSet $R9
  ${NSD_SetText} $hPct "$R9%"
  IntOp $copiedFiles $copiedFiles + 1
  ${NSD_SetText} $hCount "$copiedFiles $(L_OF) $totalFiles $(L_FILES)"
  System::Call 'user32::UpdateWindow(p $hPage)'
FunctionEnd

; ---------------------------------------------------------------- runtime

!ifdef WEB_INSTALL

; The loader embeds only resources/app.asar* and fetches the official Electron
; archive. Downloads run through a hidden child process so the custom progress
; bar keeps repainting while the file grows.
Function InstallRuntime
  StrCpy $downloadOk 0
  StrCpy $runtimeDir "$LOCALAPPDATA\CloseCode\installer-cache"
  CreateDirectory "$LOCALAPPDATA\CloseCode"
  CreateDirectory "$runtimeDir"
  StrCpy $runtimeZip "$runtimeDir\electron-v${RUNTIME_TAG}-win32-x64.zip"
  StrCpy $runtimePart "$runtimeDir\electron-runtime.part"

  ${If} ${FileExists} "$runtimeZip"
    StrCpy $R8 "$(L_LOG_VERIFY)"
    Call AppendLog
    Call VerifyRuntimeFile
    ${If} $downloadOk == 1
      Call ExtractionPhase
      Return
    ${EndIf}
    Delete "$runtimeZip"
  ${EndIf}

  ${If} $silentMode != 1
    ${NSD_SetText} $hProgLabel "$(L_SEC_DOWNLOAD)"
    ${NSD_SetText} $hProgFile "→ electron ${RUNTIME_TAG} · ${RUNTIME_MB} MB"
    ${NSD_SetText} $hPct "0%"
    ${NSD_SetText} $hCount ""
    !insertmacro UiBarSet 0
    Call RepaintPage
  ${EndIf}
  StrCpy $R8 "$(L_LOG_DOWNLOAD)"
  Call AppendLog

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

  ${If} $silentMode != 1
    ${NSD_SetText} $hProgLabel "$(L_SEC_VERIFY)"
    ${NSD_SetText} $hProgFile "→ sha256"
    ${NSD_SetText} $hPct "92%"
    !insertmacro UiBarSet 92
    Call RepaintPage
  ${EndIf}
  StrCpy $R8 "$(L_LOG_VERIFY)"
  Call AppendLog
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
    ; No spaces anywhere, so the child process needs no quoted arguments.
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
    ${If} $silentMode != 1
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
      !insertmacro UiBarSet $R5
      ${NSD_SetText} $hPct "$R5%"
      ${NSD_SetText} $hProgFile "→ $R4 $(L_OF) ${RUNTIME_MB} MB"
      System::Call 'user32::UpdateWindow(p $hPage)'
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

; The hash script resolves everything from its own folder, so neither the
; script nor its arguments carry the (possibly non-ASCII) profile path.
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
  StrCpy $R8 "$(L_LOG_EXTRACT)"
  Call AppendLog
  ${If} $silentMode != 1
    ${NSD_SetText} $hProgLabel "$(L_SEC_EXTRACT)"
    ${NSD_SetText} $hProgFile "→ $INSTDIR"
    ${NSD_SetText} $hPct "94%"
    !insertmacro UiBarSet 94
    Call RepaintPage
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
  ${IfNot} ${FileExists} "$INSTDIR\${APP_EXE}"
    StrCpy $installFailed 1
    StrCpy $installError "$(L_ERR_EXTRACT)"
    Return
  ${EndIf}

  ; Keep the two UI languages; drop the rest of the runtime locale packs.
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

  StrCpy $R8 "$(L_LOG_PREPARE)"
  Call AppendLog
  File /oname=$PLUGINSDIR\app.ico "${INSTALLER_ICON}"
!if "${RCEDIT_EXE}" != ""
  File /oname=$PLUGINSDIR\rcedit.exe "${RCEDIT_EXE}"
  nsExec::ExecToStack '"$PLUGINSDIR\rcedit.exe" "$INSTDIR\${APP_EXE}" --set-icon "$PLUGINSDIR\app.ico" --set-file-version "${APP_VERSION}" --set-product-version "${APP_VERSION}" --set-version-string "ProductName" "CloseCode" --set-version-string "FileDescription" "CloseCode" --set-version-string "CompanyName" "CloseCode"'
  Pop $R0
  Pop $R1
!endif
FunctionEnd

!endif

; ---------------------------------------------------------------- actions

Function OnToggleShortcut
  ${If} $optShortcut == 1
    StrCpy $optShortcut 0
  ${Else}
    StrCpy $optShortcut 1
  ${EndIf}
  Call RefreshOptions
FunctionEnd

Function OnToggleLaunch
  ${If} $optLaunch == 1
    StrCpy $optLaunch 0
  ${Else}
    StrCpy $optLaunch 1
  ${EndIf}
  Call RefreshOptions
FunctionEnd

Function OnBrowse
  nsDialogs::SelectFolderDialog "$(L_PICK)" "$installDir"
  Pop $R0
  ${If} $R0 != "error"
  ${AndIf} $R0 != ""
    StrCpy $installDir $R0
    Call RefreshOptions
    ShowWindow $hError 0
  ${EndIf}
FunctionEnd

; Quit from a nsDialogs click callback is swallowed by the plugin loop, so the
; wizard window has to be closed through the regular window message path.
Function OnCancel
  ${If} $busy == 0
    SendMessage $HWNDPARENT ${WM_CLOSE} 0 0
  ${EndIf}
FunctionEnd

Function OnClose
  ${If} $busy == 0
    SendMessage $HWNDPARENT ${WM_CLOSE} 0 0
  ${EndIf}
FunctionEnd

Function OnMinimize
  System::Call 'user32::ShowWindow(p $HWNDPARENT, i 6)'
FunctionEnd

; The window is borderless, so the chrome hands the drag over to the system's
; own move loop instead of tracking mouse deltas by hand.
Function OnDrag
  System::Call 'user32::ReleaseCapture()'
  SendMessage $HWNDPARENT 0x00A1 2 0
FunctionEnd

Function OnPrimary
  ${If} $busy == 1
    Return
  ${EndIf}
  ${If} $state == "options"
    ${If} $installDir == ""
      ShowWindow $hError 1
      Return
    ${EndIf}
    ClearErrors
    CreateDirectory "$installDir"
    ${If} ${errors}
      ShowWindow $hError 1
      Return
    ${EndIf}
    ShowWindow $hError 0
    StrCpy $busy 1
    Call ShowProgressState
    Call DoInstall
    StrCpy $busy 0
    ${If} $installFailed == 1
      Call ShowOptions
      ${NSD_SetText} $hError "$installError"
      ShowWindow $hError 1
      Call RepaintPage
      Return
    ${EndIf}
    Call ShowDoneState
  ${ElseIf} $state == "done"
    ${If} $optLaunch == 1
      ${If} ${FileExists} "$installDir\${APP_EXE}"
        Exec '"$installDir\${APP_EXE}"'
      ${EndIf}
    ${EndIf}
    SendMessage $HWNDPARENT ${WM_CLOSE} 0 0
  ${EndIf}
FunctionEnd

; ---------------------------------------------------------------- install

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

Function DoInstall
  StrCpy $installedFlag 1
  StrCpy $installFailed 0
  StrCpy $installError ""
  StrCpy $INSTDIR "$installDir"

  StrCpy $R8 "$(L_LOG_CLOSE)"
  Call AppendLog
!ifndef PROTO
  nsExec::Exec 'taskkill /IM "${APP_EXE}" /F'
  Pop $R0
  Sleep 250

  Call FindOldInstall
  ${If} $oldUninst != ""
  ${AndIf} $oldDir != $installDir
    StrCpy $R8 "$(L_LOG_OLD)"
    Call AppendLog
    ExecWait '$oldUninst'
    Sleep 600
  ${EndIf}
!endif

  StrCpy $R8 "$(L_LOG_FILES)"
  Call AppendLog

!ifdef WEB_INSTALL
  Call InstallRuntime
  ${If} $installFailed == 1
    Return
  ${EndIf}
  ${If} $silentMode != 1
    ${NSD_SetText} $hProgLabel "$(L_SEC_PROG)"
    ${NSD_SetText} $hProgFile "→ $INSTDIR"
    ${NSD_SetText} $hPct "94%"
    !insertmacro UiBarSet 94
    StrCpy $copiedFiles 0
    ${NSD_SetText} $hCount "0 $(L_OF) $totalFiles $(L_FILES)"
    Call RepaintPage
  ${EndIf}
  StrCpy $R8 "$(L_LOG_FILES)"
  Call AppendLog
!endif

  ; PROTO builds simulate the extraction so the UI can be reviewed quickly.
  !ifdef PROTO
    StrCpy $R9 0
    ${For} $R0 1 140
      IntOp $R9 $R0 * 100
      IntOp $R9 $R9 / 140
      StrCpy $R8 "resources\app.asar.unpacked\file-$R0.bin"
      Call StepBegin
      Sleep 12
      Call StepDone
    ${Next}
  !else
    SetOutPath "$INSTDIR"
    !include "${PAYLOAD_INCLUDE}"
  !endif

  StrCpy $R8 "$(L_LOG_UNINST)"
  Call AppendLog
!ifndef PROTO
  WriteUninstaller "$INSTDIR\${UNINST_EXE}"
  FileOpen $0 "$INSTDIR\.closecode" w
  FileWrite $0 "CloseCode ${APP_VERSION}"
  FileClose $0
!endif

  StrCpy $R8 "$(L_LOG_LINKS)"
  Call AppendLog
!ifndef PROTO
  CreateDirectory "$SMPROGRAMS"
  CreateShortCut "$SMPROGRAMS\CloseCode.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_EXE}" 0
  ${If} $optShortcut == 1
    CreateShortCut "$DESKTOP\CloseCode.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_EXE}" 0
  ${Else}
    Delete "$DESKTOP\CloseCode.lnk"
  ${EndIf}
!endif

  StrCpy $R8 "$(L_LOG_REG)"
  Call AppendLog
!ifndef PROTO
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKCU "${UNINST_KEY}" "Publisher" "CloseCode"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\${APP_EXE}"
  WriteRegStr HKCU "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINST_KEY}" "UninstallString" '"$INSTDIR\${UNINST_EXE}"'
  WriteRegStr HKCU "${UNINST_KEY}" "QuietUninstallString" '"$INSTDIR\${UNINST_EXE}" /S'
  WriteRegDWord HKCU "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoRepair" 1
  WriteRegDWord HKCU "${UNINST_KEY}" "EstimatedSize" ${PAYLOAD_KB}
!endif

  StrCpy $R8 "$(L_LOG_DONE)"
  Call AppendLog
!ifdef WEB_INSTALL
  ; The archive is only needed during setup; do not leave ~151 MB in the cache.
  Delete "$runtimeZip"
  RMDir "$runtimeDir"
!endif
FunctionEnd

Page custom CreateUI
UninstPage custom un.CreateUI

Section "install"
SectionEnd

Function .onInit
  InitPluginsDir
  StrCpy $busy 0
  StrCpy $installedFlag 0
  StrCpy $installFailed 0
  StrCpy $installError ""
  StrCpy $state "options"
  StrCpy $optShortcut 1
  StrCpy $optLaunch 1
  StrCpy $optData 0
  StrCpy $silentMode 0
  StrCpy $totalFiles ${PAYLOAD_FILES}
  StrCpy $copiedFiles 0
  StrCpy $installDir "$INSTDIR"
  StrCpy $oldDir ""
  StrCpy $oldKey ""
  StrCpy $oldUninst ""
  ${If} ${Silent}
    StrCpy $silentMode 1
    StrCpy $optLaunch 0
    ClearErrors
    CreateDirectory "$installDir"
    ${If} ${errors}
      SetErrorLevel 2
      Quit
    ${EndIf}
    Call DoInstall
    ; Quit from .onInit reports 2 unless a success code is set explicitly.
    ${If} $installFailed == 1
      SetErrorLevel 3
    ${Else}
      SetErrorLevel 0
    ${EndIf}
    Quit
  ${EndIf}
FunctionEnd

Function .onGUIEnd
FunctionEnd

; ---------------------------------------------------------------- uninstaller

Function un.ApplyRegion
  System::Alloc 16
  Pop $R0
  System::Call 'user32::GetWindowRect(p $HWNDPARENT, p $R0)'
  System::Call '*$R0(i.R1, i.R2, i.R3, i.R4)'
  System::Free $R0
  IntOp $R5 $R3 - $R1
  IntOp $R6 $R4 - $R2
  IntOp $R5 $R5 + 1
  IntOp $R6 $R6 + 1
  System::Call 'gdi32::CreateRoundRectRgn(i 0, i 0, i $R5, i $R6, i 30, i 30) p.R7'
  System::Call 'user32::SetWindowRgn(p $HWNDPARENT, p $R7, i 1)'
FunctionEnd

Function un.ApplyWindowStyle
  System::Call 'user32::GetWindowLong(p $HWNDPARENT, i -16) i.R0'
  IntOp $R1 $R0 & 0xFF30FFFF
  IntOp $R1 $R1 | 0x02000000
  System::Call 'user32::SetWindowLong(p $HWNDPARENT, i -16, i $R1)'
  System::Call 'user32::SetWindowPos(p $HWNDPARENT, p 0, i 0, i 0, i 0, i 0, i 0x0037)'
  System::Call 'user32::GetSystemMetrics(i 0) i.R2'
  System::Call 'user32::GetSystemMetrics(i 1) i.R3'
  IntOp $R4 $R2 - ${W}
  IntOp $R4 $R4 / 2
  IntOp $R5 $R3 - ${H}
  IntOp $R5 $R5 / 2
  System::Call 'user32::SetWindowPos(p $HWNDPARENT, p 0, i $R4, i $R5, i ${W}, i ${H}, i 0x0004)'
  Call un.ApplyRegion
FunctionEnd

Function un.onGUIInit
  Call un.ApplyWindowStyle
FunctionEnd

Function un.onInit
  InitPluginsDir
  StrCpy $busy 0
  StrCpy $state "options"
  StrCpy $optData 0
  StrCpy $silentMode 0
  ; Uninstallers run from a temp copy, so $EXEDIR is not the install folder.
  StrCpy $installDir "$INSTDIR"
  ${If} ${Silent}
    StrCpy $silentMode 1
    Call un.RemoveApp
    SetErrorLevel 0
    Quit
  ${EndIf}
FunctionEnd

Function un.AppendLog
  ${If} $silentMode == 1
    Return
  ${EndIf}
  StrCpy $log1Text $log2Text
  StrCpy $log2Text $log3Text
  StrCpy $log3Text $log4Text
  StrCpy $log4Text "» $R8"
  ${NSD_SetText} $hLog1 "$log1Text"
  ${NSD_SetText} $hLog2 "$log2Text"
  ${NSD_SetText} $hLog3 "$log3Text"
  ${NSD_SetText} $hLog4 "$log4Text"
  System::Call 'user32::UpdateWindow(p $hPage)'
FunctionEnd

Function un.RemoveApp
  StrCpy $R8 "$(L_LOG_CLOSE)"
  Call un.AppendLog
  nsExec::Exec 'taskkill /IM "${APP_EXE}" /F'
  Pop $R0
  Sleep 250

  StrCpy $R8 "$(L_UN_LOG_FILES)"
  Call un.AppendLog
  IfFileExists "$INSTDIR\.closecode" 0 removeTargeted
    RMDir /r "$INSTDIR"
    Goto filesDone
  removeTargeted:
    Delete "$INSTDIR\${APP_EXE}"
    Delete "$INSTDIR\${UNINST_EXE}"
    Delete "$INSTDIR\.closecode"
    RMDir /r "$INSTDIR\resources"
    RMDir /r "$INSTDIR\locales"
    RMDir "$INSTDIR"
  filesDone:

  StrCpy $R8 "$(L_UN_LOG_LINKS)"
  Call un.AppendLog
  Delete "$DESKTOP\CloseCode.lnk"
  Delete "$SMPROGRAMS\CloseCode.lnk"

  StrCpy $R8 "$(L_UN_LOG_REG)"
  Call un.AppendLog
  DeleteRegKey HKCU "${UNINST_KEY}"

  ${If} $optData == 1
    StrCpy $R8 "$(L_UN_LOG_DATA)"
    Call un.AppendLog
    RMDir /r "$APPDATA\CloseCode"
    RMDir /r "$LOCALAPPDATA\CloseCode"
  ${Else}
    StrCpy $R8 "$(L_UN_LOG_KEEP)"
    Call un.AppendLog
  ${EndIf}

  StrCpy $R8 "$(L_LOG_DONE)"
  Call un.AppendLog
FunctionEnd

Function un.RepaintPage
  System::Call 'user32::RedrawWindow(p $hPage, p 0, p 0, i 0x0185)'
FunctionEnd

Function un.ShowOptions
  StrCpy $state "options"
  ShowWindow $hOptLabel 1
  ShowWindow $hDestCaption 1
  ShowWindow $hPathOuter 1
  ShowWindow $hPathInner 1
  ShowWindow $hPathText 1
  ShowWindow $hPathLink 0
  ShowWindow $hShortPre 1
  ShowWindow $hShortText 1
  ShowWindow $hLaunchPre 0
  ShowWindow $hLaunchText 0
  ShowWindow $hDivider2 1
  ShowWindow $hBullet1 1
  ShowWindow $hBullet1Text 1
  ShowWindow $hBullet2 1
  ShowWindow $hBullet2Text 1
  ShowWindow $hBullet3 0
  ShowWindow $hBullet3Text 0
  ShowWindow $hNote 1
  ShowWindow $hProgLabel 0
  ShowWindow $hProgFile 0
  ShowWindow $hLog1 0
  ShowWindow $hLog2 0
  ShowWindow $hLog3 0
  ShowWindow $hLog4 0
  ShowWindow $hBar 0
  ShowWindow $hBarFill 0
  ShowWindow $hPct 0
  ShowWindow $hCount 0
  ShowWindow $hDoneBadge 0
  ShowWindow $hDoneCheck 0
  ShowWindow $hDoneTitle 0
  ShowWindow $hDoneBody 0
  ShowWindow $hDonePath 0
  ShowWindow $hDoneHint 0
  ShowWindow $hCancelOuter 1
  ShowWindow $hCancelInner 1
  ShowWindow $hCancelText 1
  ShowWindow $hBtnOuter 1
  ShowWindow $hBtnText 1
  ${NSD_SetText} $hBtnText "$(L_UN_BTN)"
  SetCtlColors $hBtnOuter ${C_BG} ${C_ACCENT}
  SetCtlColors $hBtnText ${C_BG} ${C_ACCENT}
  ${NSD_SetText} $hFootHint "$(L_FOOT)"
  SetCtlColors $hFootHint ${C_MUTED} ${C_BG}
  Call un.RepaintPage
FunctionEnd

Function un.ShowProgress
  StrCpy $state "progress"
  ShowWindow $hOptLabel 0
  ShowWindow $hDestCaption 0
  ShowWindow $hPathOuter 0
  ShowWindow $hPathInner 0
  ShowWindow $hPathText 0
  ShowWindow $hPathLink 0
  ShowWindow $hShortPre 0
  ShowWindow $hShortText 0
  ShowWindow $hLaunchPre 0
  ShowWindow $hLaunchText 0
  ShowWindow $hDivider2 0
  ShowWindow $hBullet1 0
  ShowWindow $hBullet1Text 0
  ShowWindow $hBullet2 0
  ShowWindow $hBullet2Text 0
  ShowWindow $hBullet3 0
  ShowWindow $hBullet3Text 0
  ShowWindow $hNote 0
  ShowWindow $hDoneBadge 0
  ShowWindow $hDoneCheck 0
  ShowWindow $hDoneTitle 0
  ShowWindow $hDoneBody 0
  ShowWindow $hDonePath 0
  ShowWindow $hDoneHint 0
  ShowWindow $hCancelOuter 0
  ShowWindow $hCancelInner 0
  ShowWindow $hCancelText 0
  ShowWindow $hBtnOuter 0
  ShowWindow $hBtnText 0
  ShowWindow $hProgLabel 1
  ShowWindow $hProgFile 0
  ShowWindow $hLog1 1
  ShowWindow $hLog2 1
  ShowWindow $hLog3 1
  ShowWindow $hLog4 1
  ShowWindow $hBar 1
  ShowWindow $hBarFill 1
  ShowWindow $hPct 1
  ShowWindow $hCount 0
  StrCpy $log1Text ""
  StrCpy $log2Text ""
  StrCpy $log3Text ""
  StrCpy $log4Text ""
  ${NSD_SetText} $hLog1 ""
  ${NSD_SetText} $hLog2 ""
  ${NSD_SetText} $hLog3 ""
  ${NSD_SetText} $hLog4 ""
  ${NSD_SetText} $hPct "0%"
  !insertmacro UiBarSet 0
  ${NSD_SetText} $hFootHint "$(L_UN_BUSY)"
  SetCtlColors $hFootHint ${C_ACCENT_DIM} ${C_BG}
  Call un.RepaintPage
FunctionEnd

Function un.ShowDone
  StrCpy $state "done"
  ShowWindow $hProgLabel 0
  ShowWindow $hLog1 0
  ShowWindow $hLog2 0
  ShowWindow $hLog3 0
  ShowWindow $hLog4 0
  ShowWindow $hBar 0
  ShowWindow $hBarFill 0
  ShowWindow $hPct 0
  ShowWindow $hDoneBadge 1
  ShowWindow $hDoneCheck 1
  ShowWindow $hDoneTitle 1
  ShowWindow $hDoneBody 1
  ShowWindow $hDonePath 1
  ShowWindow $hDoneHint 1
  ShowWindow $hBtnOuter 1
  ShowWindow $hBtnText 1
  ${NSD_SetText} $hBtnText "$(L_BTN_CLOSE)"
  ${NSD_SetText} $hDoneTitle "$(L_UN_SEC)"
  ${NSD_SetText} $hDoneBody "$(L_UN_DONE_BODY)"
  ${NSD_SetText} $hDonePath "→ $installDir"
  ${If} $optData == 1
    ${NSD_SetText} $hDoneHint "› $(L_UN_DONE_HINT2)"
  ${Else}
    ${NSD_SetText} $hDoneHint "› $(L_UN_DONE_HINT)"
  ${EndIf}
  ${NSD_SetText} $hFootHint "$(L_FOOT)"
  SetCtlColors $hFootHint ${C_MUTED} ${C_BG}
  Call un.RepaintPage
FunctionEnd

Function un.ToggleData
  ${If} $optData == 1
    StrCpy $optData 0
    ${NSD_SetText} $hShortPre "[ ]"
    SetCtlColors $hShortPre ${C_DIM} ${C_BG}
  ${Else}
    StrCpy $optData 1
    ${NSD_SetText} $hShortPre "[x]"
    SetCtlColors $hShortPre ${C_ACCENT} ${C_BG}
  ${EndIf}
  !insertmacro UiHover $hShortPre
FunctionEnd

Function un.OnCancel
  ${If} $busy == 0
    SendMessage $HWNDPARENT ${WM_CLOSE} 0 0
  ${EndIf}
FunctionEnd

Function un.OnClose
  ${If} $busy == 0
    SendMessage $HWNDPARENT ${WM_CLOSE} 0 0
  ${EndIf}
FunctionEnd

Function un.OnMinimize
  System::Call 'user32::ShowWindow(p $HWNDPARENT, i 6)'
FunctionEnd

Function un.OnDrag
  System::Call 'user32::ReleaseCapture()'
  SendMessage $HWNDPARENT 0x00A1 2 0
FunctionEnd

Function un.OnPrimary
  ${If} $busy == 1
    Return
  ${EndIf}
  ${If} $state == "options"
    StrCpy $busy 1
    Call un.ShowProgress
    Call un.RemoveApp
    StrCpy $busy 0
    Call un.ShowDone
  ${ElseIf} $state == "done"
    SendMessage $HWNDPARENT ${WM_CLOSE} 0 0
  ${EndIf}
FunctionEnd

Function un.CreateUI
  nsDialogs::Create 1018
  Pop $hPage
  ${If} $hPage == error
    Abort
  ${EndIf}
  !insertmacro UiPos $hPage 0 0 ${W} ${H}
  ; The nsDialogs page static (id 1018) covers the whole window and would
  ; take every click meant for the labels; disabled windows are skipped by
  ; hit-testing, so the labels underneath receive the mouse instead.
  GetDlgItem $0 $HWNDPARENT 1018
  EnableWindow $0 0

  GetDlgItem $0 $HWNDPARENT 1
  ShowWindow $0 0
  EnableWindow $0 0
  GetDlgItem $0 $HWNDPARENT 2
  ShowWindow $0 0
  GetDlgItem $0 $HWNDPARENT 3
  ShowWindow $0 0
  EnableWindow $0 0

  !insertmacro LoadFont $fTiny -11 400 "Consolas"
  !insertmacro LoadFont $fSmall -12 400 "Consolas"
  !insertmacro LoadFont $fBody -14 400 "Consolas"
  !insertmacro LoadFont $fBodyBold -14 700 "Consolas"
  !insertmacro LoadFont $fPath -14 400 "Consolas"
  !insertmacro LoadFont $fLogo -30 700 "Consolas"
  !insertmacro LoadFont $fHead -24 700 "Consolas"
  !insertmacro LoadFont $fGlyph -14 400 "Segoe UI"
  !insertmacro LoadFont $fBtn -14 600 "Consolas"

  ; frame + background
  !insertmacro UiLabelBg $hBorderBg "" 0 0 ${W} ${H} $fTiny ${C_BG} ${C_LINE}
  !insertmacro UiLabelBg $hBg "" 1 1 ${W} 468 $fTiny ${C_BG} ${C_BG}

  ; chrome
  !insertmacro UiLabelBg $hChrome "" 1 1 718 39 $fTiny ${C_BG} ${C_CHROME}
  !insertmacro UiLabelBg $hChromeLine "" 1 40 718 1 $fTiny ${C_BG} ${C_LINE}
  !insertmacro UiLabelBg $hDot1 "●" 18 14 12 12 $fGlyph ${C_DOT_R} ${C_CHROME}
  !insertmacro UiLabelBg $hDot2 "●" 32 14 12 12 $fGlyph ${C_DOT_Y} ${C_CHROME}
  !insertmacro UiLabelBg $hDot3 "●" 46 14 12 12 $fGlyph ${C_DOT_G} ${C_CHROME}
  !insertmacro UiLabelBg $hTitle "$(L_CHROME_UNINSTALL)" 66 12 90 16 $fSmall ${C_MUTED} ${C_CHROME}
  !insertmacro UiLabelBg $hChip "$(L_CHIP_UN)" 146 12 72 16 $fTiny ${C_ACCENT} ${C_ACCENT_SOFT}
  !insertmacro UiStyle $hChip 0x1
  !insertmacro UiLabelBg $hMin "–" 646 9 26 22 $fGlyph ${C_MUTED} ${C_CHROME}
  !insertmacro UiStyle $hMin 0x101
  !insertmacro UiLabelBg $hClose "✕" 676 9 26 22 $fGlyph ${C_MUTED} ${C_CHROME}
  !insertmacro UiStyle $hClose 0x101

  ; hero
  !insertmacro UiHero "$(L_UN_TAG)"

  ; options
  !insertmacro UiLabelBg $hOptLabel "❯ $(L_UN_SEC)" 30 158 300 18 $fSmall ${C_ACCENT} ${C_BG}
  !insertmacro UiLabelBg $hDestCaption "$(L_DEST)" 30 186 300 14 $fTiny ${C_MUTED} ${C_BG}
  !insertmacro UiLabelBg $hPathOuter "" 30 204 660 38 $fTiny ${C_BG} ${C_LINE}
  !insertmacro UiLabelBg $hPathInner "" 31 205 658 36 $fTiny ${C_BG} ${C_CARD}
  !insertmacro UiLabelBg $hPathText "$installDir" 46 214 610 20 $fPath ${C_TEXT_SOFT} ${C_CARD}
  !insertmacro UiStyle $hPathText 0x8000
  !insertmacro UiLabelBg $hPathLink "" 606 214 70 20 $fSmall ${C_ACCENT} ${C_CARD}
  ShowWindow $hPathLink 0

  !insertmacro UiLabelBg $hShortPre "[ ]" 30 256 26 18 $fBody ${C_DIM} ${C_BG}
  !insertmacro UiStyle $hShortPre ${SS_NOTIFY}
  !insertmacro UiLabelBg $hShortText "$(L_UN_DATA)" 58 256 460 18 $fBody ${C_TEXT_SOFT} ${C_BG}
  !insertmacro UiStyle $hShortText ${SS_NOTIFY}
  !insertmacro UiLabelBg $hLaunchPre "" 30 282 26 18 $fBody ${C_TEXT_SOFT} ${C_BG}
  !insertmacro UiLabelBg $hLaunchText "" 58 282 340 18 $fBody ${C_TEXT_SOFT} ${C_BG}

  !insertmacro UiLabelBg $hDivider2 "" 30 322 660 1 $fTiny ${C_BG} ${C_LINE_SOFT}
  !insertmacro UiLabelBg $hBullet1 "›" 30 336 14 16 $fSmall ${C_ACCENT_DIM} ${C_BG}
  !insertmacro UiLabelBg $hBullet1Text "$(L_UN_B1)" 46 336 600 16 $fSmall ${C_MUTED} ${C_BG}
  !insertmacro UiLabelBg $hBullet2 "›" 30 356 14 16 $fSmall ${C_ACCENT_DIM} ${C_BG}
  !insertmacro UiLabelBg $hBullet2Text "$(L_UN_B2)" 46 356 600 16 $fSmall ${C_MUTED} ${C_BG}
  !insertmacro UiLabelBg $hBullet3 "›" 30 376 14 16 $fSmall ${C_ACCENT_DIM} ${C_BG}
  !insertmacro UiLabelBg $hBullet3Text "" 46 376 600 16 $fSmall ${C_MUTED} ${C_BG}
  !insertmacro UiLabelBg $hNote "$(L_UN_NOTE)" 30 396 600 14 $fTiny ${C_DIM} ${C_BG}

  ; progress
  !insertmacro UiLabelBg $hProgLabel "❯ $(L_UN_SEC)" 30 158 300 18 $fSmall ${C_ACCENT} ${C_BG}
  !insertmacro UiLabelBg $hProgFile "→" 30 186 640 20 $fPath ${C_TEXT} ${C_BG}
  !insertmacro UiStyle $hProgFile 0x4000
  !insertmacro UiLabelBg $hLog1 "" 30 220 640 18 $fSmall ${C_DIM} ${C_BG}
  !insertmacro UiLabelBg $hLog2 "" 30 240 640 18 $fSmall ${C_DIM} ${C_BG}
  !insertmacro UiLabelBg $hLog3 "" 30 260 640 18 $fSmall ${C_DIM} ${C_BG}
  !insertmacro UiLabelBg $hLog4 "" 30 280 640 18 $fSmall ${C_MUTED} ${C_BG}
  ${NSD_CreateProgressBar} 0 0 0 0 ""
  Pop $hBar
  !insertmacro UiProgressBar
  !insertmacro UiLabelBg $hPct "0%" 640 306 50 22 $fBodyBold ${C_ACCENT} ${C_BG}
  !insertmacro UiStyle $hPct 0x2
  !insertmacro UiLabelBg $hCount "" 30 332 600 16 $fTiny ${C_MUTED} ${C_BG}

  ; done
  !insertmacro UiLabelBg $hDoneBadge "" 30 166 44 44 $fTiny ${C_BG} ${C_ACCENT}
  !insertmacro UiRound $hDoneBadge 44 44 16
  !insertmacro UiLabelBg $hDoneCheck "✓" 30 175 44 28 $fHead ${C_BG} ${C_ACCENT}
  !insertmacro UiStyle $hDoneCheck 0x1
  !insertmacro UiLabelBg $hDoneTitle "$(L_UN_SEC)" 90 164 400 34 $fHead ${C_TEXT} ${C_BG}
  !insertmacro UiLabelBg $hDoneBody "$(L_UN_DONE_BODY)" 90 204 500 20 $fBody ${C_MUTED} ${C_BG}
  !insertmacro UiLabelBg $hDonePath "" 30 250 640 18 $fSmall ${C_DIM} ${C_BG}
  !insertmacro UiStyle $hDonePath 0x8000
  !insertmacro UiLabelBg $hDoneHint "" 30 286 620 18 $fSmall ${C_MUTED} ${C_BG}

  ; footer
  !insertmacro UiLabelBg $hFootLine "" 30 406 660 1 $fTiny ${C_BG} ${C_LINE}
  !insertmacro UiLabelBg $hFootHint "$(L_FOOT)" 30 422 380 16 $fTiny ${C_MUTED} ${C_BG}
  !insertmacro UiLabelBg $hCancelOuter "" 432 414 96 34 $fTiny ${C_BG} ${C_LINE}
  !insertmacro UiStyle $hCancelOuter ${SS_NOTIFY}
  !insertmacro UiRound $hCancelOuter 96 34 12
  !insertmacro UiLabelBg $hCancelInner "" 433 415 94 32 $fTiny ${C_BG} ${C_BG}
  !insertmacro UiStyle $hCancelInner ${SS_NOTIFY}
  !insertmacro UiRound $hCancelInner 94 32 12
  !insertmacro UiLabelBg $hCancelText "$(L_BTN_CANCEL)" 432 422 96 18 $fBtn ${C_MUTED} ${C_BG}
  !insertmacro UiStyle $hCancelText 0x101
  !insertmacro UiLabelBg $hBtnOuter "" 540 414 150 34 $fTiny ${C_BG} ${C_ACCENT}
  !insertmacro UiStyle $hBtnOuter ${SS_NOTIFY}
  !insertmacro UiRound $hBtnOuter 150 34 12
  !insertmacro UiLabelBg $hBtnText "$(L_UN_BTN)" 540 422 150 18 $fBtn ${C_BG} ${C_ACCENT}
  !insertmacro UiStyle $hBtnText 0x101

  Call un.ShowOptions

  ${NSD_OnClick} $hBtnOuter un.OnPrimary
  ${NSD_OnClick} $hBtnText un.OnPrimary
  ${NSD_OnClick} $hCancelOuter un.OnCancel
  ${NSD_OnClick} $hCancelInner un.OnCancel
  ${NSD_OnClick} $hCancelText un.OnCancel
  ${NSD_OnClick} $hShortPre un.ToggleData
  ${NSD_OnClick} $hShortText un.ToggleData
  ${NSD_OnClick} $hMin un.OnMinimize
  ${NSD_OnClick} $hClose un.OnClose
  ${NSD_OnClick} $hChrome un.OnDrag
  ${NSD_OnClick} $hChromeLine un.OnDrag
  ${NSD_OnClick} $hTitle un.OnDrag
  ${NSD_OnClick} $hDot1 un.OnDrag
  ${NSD_OnClick} $hDot2 un.OnDrag
  ${NSD_OnClick} $hDot3 un.OnDrag
  nsDialogs::Show
FunctionEnd
