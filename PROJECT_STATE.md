# PROJECT_STATE: CloseCode (Fork nanodevmc/CloseCode)

## 1. Стек и архитектура
- **Runtime & Desktop:** Electron, TypeScript, Vite (electron-vite).
- **Frontend:** React 19, CSS modules / custom Liquid Glass styles, xterm.js.
- **LLM Engine:** SSE stream parsers (OpenAI, Anthropic, DeepSeek, Google Gemini, Groq, Mistral, xAI).
- **Upstream:** `TulenTulenivich/CloseCode:main`
- **Fork:** `nanodevmc/CloseCode` (ветка `audit-fixes` -> PR #1).

## 2. Что реализовано
- **50 багфиксов:** исправление ENOENT в инструментах, рекурсивного глоббинга `**`, WHATWG SSE пробелов, склейки сообщений Anthropic, стриминга `reasoning_content`, атомарного сохранения настроек/сессий против блокировок Windows.
- **Интеграция DeepSeek:**
  - Пресет `https://api.deepseek.com`, модели `deepseek-chat` (V3) и `deepseek-reasoner` (R1).
  - Исключение `reasoning_effort` и нестандартных температур для предотвращения ошибок 400 API DeepSeek.
  - Нативный стриминг reasoning deltas в блок мыслей.
- **Мультиаккаунты & Быстрое переключение:**
  - Кнопка дублирования аккаунта в `SettingsScreen` (создание копии профиля с независимым API-ключом).
  - Горизонтальная панель чипов платформ/аккаунтов в `ModelPicker` для моментального переключения в 1 клик.
- **CI/CD Релизы под Windows:**
  - Workflow `.github/workflows/release.yml` для автоматической сборки Portable `.exe` через `electron-builder` и публикации в GitHub Releases.
- **Экспорт и UI:** экспорт чата в структурированный JSON (`exportChatJson`), копирование ответов ассистента в буфер, безопасная фильтрация протоколов ссылок.

## 3. Проверка правил GitHub
- Сборка на `windows-latest` укладывается в нормальные лимиты (2–3 мин), без майнинга и abuse.
- В коде и workflow отсутствуют секреты (используется ephemeral `secrets.GITHUB_TOKEN`).
- Лицензия MIT и авторские права соблюдены.

## 4. Сборка и верификация
- `npm run typecheck` — 0 ошибок.
- `npm run test:agent` — 9/9 тестов пройдено.
- `npm run build` — чистая сборка frontend и backend.
