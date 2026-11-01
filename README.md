# CloseCode

Настольный AI-агент для работы с кодом на Windows. Свои ключи, прямые запросы к провайдеру, никакого посредника между вашей машиной и API.

**Русский** ниже · [**English** further down](#english)

> Автор слишком ленив, чтобы писать этот README руками, - поэтому его написал собственный агент по факту кода. Если что-то расходится с реальностью, правьте pull request'ом.

## Приватность по устройству, а не по обещанию

- Ключи живут только в main-процессе и лежат на диске в зашифрованном виде (`safeStorage`, на Windows это DPAPI). В renderer уходит только флаг «ключ есть» - plaintext-ключ в интерфейс не попадает никогда.
- Из приложения уходит только то, что вы сами отправили агенту: запросы идут прямо с вашей машины на эндпоинт провайдера. Своих серверов, телеметрии и прокси в программе нет; прокси появляется только если вы сами впишете адрес в настройки - и тогда запросы идут через него.
- Каждая запись в файл идёт через подтверждение: вы видите diff и решаете, применить один раз, разрешить папку целиком или отказаться. Политика настраивается - `always` / `smart` / `never`, по умолчанию самая осторожная.
- Папки вне выбранного проекта агенту недоступны, пока вы явно их не разрешите; список разрешённых корней хранится у вас в настройках.
- Приватная сессия: переписка, заголовок задачи и статистика инструментов не записываются на диск.
- Скриншоты и фотографии идут из main-процесса сразу в провайдер и не сохраняются в проекте, если вы сами не попросите агента их записать.

## Что агент умеет делать

| Инструмент | Назначение |
| --- | --- |
| `list_files`, `search_files`, `read_file` | Ориентироваться в проекте и читать код перед правкой |
| `write_file` | Создавать и менять файлы - только после вашего подтверждения diff |
| `ask_user` | Задать вам один короткий вопрос с вариантами ответа и ждать, пока вы ответите |
| `take_screenshot` | Посмотреть, что сейчас у вас на экране |
| `open_project` | Переключить приложение на другой зарегистрированный проект |
| `generate_image` | Сгенерировать картинку доступной image-моделью, с подтверждением сохранения |
| `run_subagent` | Делегировать широкое исследование другому агенту - он вернёт только выжимку |
| `use_skill` | Подтянуть инструкции установленного скилла, когда задача подходит под него |

Плюс к этому: настоящая shell-вкладка через PTY, счётчик контекста с авто-сжатием прямо посреди задачи («сжал и продолжил сам»), дерево проекта в выдвижной панели, вложения файлов и фото прямо в поле ввода и «второе мнение» - ответ проверяет другая модель, выбранная в настройках.

## Модель, мощность, бесплатно

- Провайдеры: любой OpenAI-совместимый эндпоинт и Anthropic. Base URL задаёте сами, несколько провайдеров держатся одновременно.
- При первом запуске уже подключён провайдер «Бесплатные модели» - 9 моделей через gateway, без ключа. Работает ровно пока у gateway есть свободная ёмкость, так что для серьёзной работы лучше сразу вписать свой ключ.
- Мощность рассуждения выбирается по API-уровням конкретной модели (`minimal`, `low`, `medium`, `high`, `xhigh`, `max`) - список зависит от модели, выдуманных ярлыков нет.
- Загрузка модели видна в реальном времени: токенов в секунду и задержка до первого символа.
- OpenAI и Anthropic молчат из РФ и РБ. В настройках есть поле «Прокси»: впишите туда свой `http://127.0.0.1:7890` (Clash, v2rayN, что угодно) - запросы пойдут через него, и блокировка региона снимается. Работает для всех провайдеров, включая список моделей и генерацию картинок. Без прокси напрямую отвечают бесплатные модели, OpenRouter и локальные эндпоинты. Если провайдер блокирует по региону, вместо голого `HTTP 403` покажется подсказка с тремя вариантами действий.

## Интерфейс

Три темы (`graphite` по умолчанию, `light`, `midnight`) и шесть акцентов, переключение языка RU/EN, автоматический заголовок задачи по первому запросу, карта активности по дням с листанием по три месяца, несколько проектов - каждому своя история и свои скиллы.

Окно работает в двух режимах: обычное приложение и мини-терминал - компактная безрамочная версия, в которую сжимается весь интерфейс, включая карточки подтверждения записи и ответа на вопрос.

## Установка

**Бинарники** - в Releases этого репозитория лежит один файл:

- [`CloseCode-Offline-0.1.0-x64.exe`](https://github.com/TulenTulenivich/CloseCode/releases/download/v0.1.0/CloseCode-Offline-0.1.0-x64.exe) - полный установщик (~105 МБ), приложение целиком внутри, интернет для установки не нужен.

Установщик не подписан сертификатом, поэтому SmartScreen первый раз спросит подтверждение.

**Из исходников:**

```bash
npm install
npm run dev            # приложение в electron-vite
```

Для сборки установщиков нужны Windows, NSIS с `makensis` в `PATH` и интернет на время загрузки Electron-архива:

```bash
npm run build:win      # Setup / Offline / Portable в release/
```

В Release публикуется только offline-сборка - её хватает на машину без интернета, и это один файл вместо трёх.

## Команды

| Команда | Что делает |
| --- | --- |
| `npm run dev` | Приложение в dev-режиме |
| `npm run preview:web` | UI-превью в браузере на демо-API - без Electron и без ключей |
| `npm run typecheck` | Проверка типов main и renderer |
| `npm run test:agent` | Смоук-тесты агента на локальной фейковой SSE-раздаче |
| `npm run build` | Только сборка бандла в `out/` |
| `npm run build:win` | Бандл + Setup / Offline / Portable в `release/` |
| `npm run build:dir` | Неразвёрнутая папка приложения для быстрой проверки |

## Как устроено

```
src/main/            electron-мейн: настройки, сессии, инструменты, IPC
src/main/agent/      цикл агента (до 32 шагов), контекст, системный промпт, тулзы
src/main/llm/        стриминг OpenAI и Anthropic, SSE, картинки, имена моделей
src/preload/         единственный мост между main и renderer
src/renderer/        React-интерфейс: чат, composer, настройки, мини-терминал, превью
src/shared/          типы и словарь строк, общие для обоих процессов
scripts/             сборка установщиков, смоук-тесты, графика
resources/           иконка, логотип установщика, NSIS-скрипты
```

Настройки, история, ключи и скиллы лежат в `%APPDATA%\CloseCode` и в репозиторий не попадают.

## Известные ограничения

- Проверено и собрано только под Windows x64; на других ОС не тестировалось.
- Один прогон ограничен 32 шагами инструментов. На лимите агент останавливается с сообщением «Агент достиг лимита шагов» - задачу надо сузить и продолжить.
- Лимиты бесплатного gateway чужие и меняются без предупреждения - это не SLA.
- Установщик не подписан, а offline-артефакт весит больше 100 МБ, поэтому бинарники живут в Releases, а не в коде.

---

## English

A local-first desktop coding agent for Windows. Your own API keys, direct calls to the provider, no middleman between your machine and the API.

> The author is too lazy to write this README by hand, so his own agent wrote it against the actual code. If something drifts from reality, send a pull request.

### Privacy by construction, not by promise

- Keys live in the main process only and rest on disk encrypted (`safeStorage`, which is DPAPI on Windows). The renderer receives a "has key" flag and never the plaintext.
- Only what you send to the agent leaves your machine, and it goes straight to the provider endpoint you configured. No servers of ours, no telemetry, no proxy - a proxy appears only if you type an address in Settings, and then requests do travel through it.
- Every file write is gated by an approval: you read the diff and decide to apply once, allow the folder, or refuse. The policy is configurable - `always` / `smart` / `never`, and the default is the careful one.
- Folders outside the selected project stay unreachable until you explicitly allow them; the allowed roots are kept in your own settings.
- Private session: transcript, task title and tool statistics are never written to disk.
- Screenshots and photos travel from the main process straight to the provider and are not saved into your project unless you tell the agent to.

### What the agent can do

| Tool | Purpose |
| --- | --- |
| `list_files`, `search_files`, `read_file` | Walk the project and read code before touching it |
| `write_file` | Create and change files - only after you approve the diff |
| `ask_user` | Ask you one short question with tap-able answers and wait for the reply |
| `take_screenshot` | Look at what is on your screen right now |
| `open_project` | Move the app to another registered project |
| `generate_image` | Draw a picture with an available image model, with a save approval |
| `run_subagent` | Delegate broad research to another agent that reports back a summary |
| `use_skill` | Load the instructions of an installed skill when the task matches |

On top of that: a real shell tab over PTY, a context meter that compacts itself mid-task ("summarized and carried on"), a project tree in a slide-out drawer, file and photo attachments right in the composer, and a second opinion - another model you pick in Settings reviews the answer.

### Models, effort, free tier

- Providers: any OpenAI-compatible endpoint and Anthropic. You set the base URL yourself, and several providers can be configured at once.
- On first run a "Free models" provider is already wired up: 9 models through a gateway, no key needed. It works only while that gateway has spare capacity, so add your own key for real work.
- Thinking effort follows the API levels of each model (`minimal`, `low`, `medium`, `high`, `xhigh`, `max`) - the list depends on the model, no invented labels.
- Live model load is shown in the UI: tokens per second and time to first token.
- OpenAI and Anthropic stay silent from RF and RB. Settings have a "Proxy" field: drop in your own `http://127.0.0.1:7890` (Clash, v2rayN, anything) and requests go through it, which lifts the regional block. It covers every provider call, including the model list and image generation. Without a proxy, the free models, OpenRouter and local endpoints still answer directly. When a provider blocks your region you get a hint with three ways forward instead of a bare `HTTP 403`.

### Interface

Three themes (`graphite` by default, `light`, `midnight`) and six accents, RU/EN switching, an automatic task title from the first request, a day-by-day activity heatmap that pages three months at a time, and several projects - each with its own history and its own skills.

The window runs in two modes: the regular app and a mini terminal - a compact frameless version that the whole interface folds into, approval cards and question cards included.

### Install

**Binaries** - one file in this repository's Releases:

- [`CloseCode-Offline-0.1.0-x64.exe`](https://github.com/TulenTulenivich/CloseCode/releases/download/v0.1.0/CloseCode-Offline-0.1.0-x64.exe) - the full installer (~105 MB), the whole app inside, no internet needed to install.

The installer is not code-signed, so SmartScreen asks for confirmation the first time.

**From source:**

```bash
npm install
npm run dev            # the app under electron-vite
```

Building installers takes Windows, NSIS with `makensis` on `PATH`, and internet access while the Electron archive downloads:

```bash
npm run build:win      # Setup / Offline / Portable in release/
```

Only the offline build goes into Releases - it covers a machine without internet, and it is one file instead of three.

### Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | The app in dev mode |
| `npm run preview:web` | UI preview in a browser on a demo API - no Electron, no keys |
| `npm run typecheck` | Type checks for main and renderer |
| `npm run test:agent` | Agent smoke tests against a local fake SSE server |
| `npm run build` | Bundle into `out/` only |
| `npm run build:win` | Bundle plus Setup / Offline / Portable into `release/` |
| `npm run build:dir` | Unpacked app folder for a quick check |

### Layout

```
src/main/            electron main: settings, sessions, tools, IPC
src/main/agent/      the agent loop (up to 32 steps), context, system prompt, tools
src/main/llm/        OpenAI and Anthropic streaming, SSE, images, model names
src/preload/         the only bridge between main and renderer
src/renderer/        React UI: chat, composer, settings, mini terminal, preview
src/shared/          types and the string table shared by both processes
scripts/             installer build, smoke tests, artwork
resources/           icon, installer logo, NSIS scripts
```

Settings, history, keys and skills live in `%APPDATA%\CloseCode` and never end up in the repository.

### Known limits

- Only built and tested on Windows x64; other operating systems are untested.
- A single run is capped at 32 tool steps. At the cap the agent stops with "The agent hit its step limit" - narrow the task and continue.
- The free gateway's limits belong to someone else and change without notice; it is not an SLA.
- The installer is unsigned and the offline build is over 100 MB, so binaries live in Releases rather than in the code.

## Лицензия / License

MIT - см. `package.json` / see `package.json`.
