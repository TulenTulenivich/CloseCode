export type Lang = 'ru' | 'en'

const entries = {
  'chrome.settings': ['Настройки', 'Settings'],
  'chrome.api': ['{n} API', '{n} API'],
  'chrome.apiKey': ['API-ключ', 'API key'],
  'chrome.title': ['CloseCode — ваш локальный AI-агент', 'CloseCode — your local AI agent'],
  'chrome.loading': ['Загрузка…', 'Loading…'],
  'chrome.closeToast': ['Закрыть уведомление', 'Close notification'],
  'chrome.providers': ['Провайдеры и ключи', 'Providers and keys'],
  'chrome.minimize': ['Свернуть', 'Minimize'],
  'chrome.maximize': ['Развернуть на весь экран', 'Maximize'],
  'chrome.restore': ['Вернуть прежний размер', 'Restore'],
  'chrome.close': ['Закрыть окно', 'Close window'],
  'chrome.tree': ['Дерево проекта', 'Project tree'],

  'tree.title': ['Файлы проекта', 'Project files'],
  'tree.refresh': ['Обновить', 'Refresh'],
  'tree.close': ['Закрыть', 'Close'],
  'tree.empty': ['Папка пуста.', 'This folder is empty.'],
  'tree.loading': ['Читаю папку…', 'Reading folder…'],
  'tree.hint': [
    'Клик по файлу открывает его в проводнике, двойной клик копирует путь.',
    'Click a file to reveal it, double-click to copy its path.'
  ],

  'side.mode': ['Режим', 'Mode'],
  'side.coding': ['Coding', 'Coding'],
  'side.newTask': ['Новая задача', 'New task'],
  'side.projects': ['Проекты', 'Projects'],
  'side.activity': ['Активность', 'Activity'],
  'side.securityTitle': ['Только на устройстве', 'On-device only'],
  'side.securityBody': [
    'Ключи шифруются на этом компьютере и не покидают его.',
    'Keys are encrypted on this machine and never leave it.'
  ],
  'side.currentTask': ['Текущая задача', 'Current task'],
  'side.private': ['Приватная сессия', 'Private session'],
  'side.privateOn': ['приватно · история не сохраняется', 'private · history is not saved'],
  'side.privateOff': ['обычная сессия · история сохраняется', 'regular · history is saved'],
  'side.privateHint': [
    'Приватная сессия не пишет историю и статистику на диск. Переключение начинает чистый диалог.',
    'A private session writes no history or stats to disk. Switching starts a clean conversation.'
  ],
  'side.connectModel': ['Подключить модель', 'Connect a model'],
  'side.connectModelSub': ['API-ключ и провайдер', 'Provider and API key'],
  'side.addProject': ['Добавить проект', 'Add project'],
  'side.noProject': ['проект не выбран', 'no project selected'],
  'side.localFolder': ['локальная папка', 'local folder'],
  'side.removeProject': ['Убрать из списка', 'Remove from list'],
  'side.taskIdle': ['нет активной задачи', 'no active task'],
  'side.providerKeys': ['Провайдеры и API-ключи', 'Providers and API keys'],
  'side.projectMeta': ['{messages} · {time}', '{messages} · {time}'],
  'side.noMessages': ['без сообщений', 'no messages'],
  'side.today': ['сегодня', 'today'],
  'side.yesterday': ['вчера', 'yesterday'],
  'side.daysAgo': ['{n} дн назад', '{n}d ago'],
  'side.weeksAgo': ['{n} нед назад', '{n}w ago'],
  'side.justNow': ['только что', 'just now'],
  'side.privateToggle': ['Приватный режим', 'Private mode'],

  'w.helloProject': ['Чем займёмся\nв {name}?', 'What shall we do\nin {name}?'],
  'w.helloPlain': ['Ваш код.\nВаш AI-агент.', 'Your code.\nYour AI agent.'],
  'w.subProject': [
    'Опишите задачу или прикрепите файл. Агент прочитает код, покажет шаги и предложит diff до записи.',
    'Describe the task or attach a file. The agent reads your code, shows each step and proposes a diff before writing.'
  ],
  'w.subPlain': [
    'Свой API-ключ, свой проект, свой агент. Без подписок.',
    'Your own API key, your own project, your own agent. No subscriptions.'
  ],
  'w.ready': ['готов к работе', 'ready to work'],
  'w.needKey': ['нужен API-ключ', 'API key needed'],
  'w.modelNone': ['Модель не подключена', 'No model connected'],
  'w.free': ['{n} свободно', '{n} free'],
  'w.autoCompact': ['автосжатие при {n}%', 'auto-compact at {n}%'],
  'w.startHead': ['С чего начать', 'Start with'],
  'w.startHint': ['нажмите, чтобы подставить запрос', 'click to fill the prompt'],
  'w.suggStructure': ['Структура проекта', 'Project structure'],
  'w.suggStructureDesc': ['Карта файлов и точек входа', 'Map of files and entry points'],
  'w.suggBugs': ['Поиск багов', 'Bug hunt'],
  'w.suggBugsDesc': ['Аудит логики и обработки ошибок', 'Audit logic and error handling'],
  'w.suggReadme': ['README проекта', 'Project README'],
  'w.suggReadmeDesc': ['Документация, запуск и скрипты', 'Docs, setup and scripts'],
  'w.suggPlan': ['Составить план', 'Draft a plan'],
  'w.suggPlanDesc': ['Разбить задачу на шаги', 'Break the task into steps'],
  'w.capKeys': ['ключи шифруются локально', 'keys encrypted on device'],
  'w.capApproval': ['запись только после подтверждения', 'writes need approval'],
  'w.capCompact': ['контекст сжимается автоматически', 'context compacts automatically'],
  'w.pickFolder': [
    'Чтобы агент мог читать и править код, добавьте папку проекта в сайдбаре.',
    'To let the agent read and edit code, add a project folder in the sidebar.'
  ],
  'w.connectTitle': ['Подключите свою модель', 'Connect your own model'],
  'w.connectBody': [
    'OpenAI, Anthropic, DeepSeek, OpenRouter, Ollama — или любой свой API.',
    'OpenAI, Anthropic, DeepSeek, OpenRouter, Ollama — or any API of your own.'
  ],
  'w.connectBtn': ['Добавить API-ключ', 'Add an API key'],

  'p.structure': ['Объясни структуру этого проекта', 'Explain the structure of this project'],
  'p.bugs': ['Найди потенциальные баги в коде', 'Find potential bugs in the code'],
  'p.readme': ['Добавь README с описанием проекта', 'Add a README describing the project'],
  'p.plan': [
    'Составь план задачи, не меняя файлы',
    'Draft a plan for a task without changing files'
  ],

  'c.placeholder': [
    'Опишите задачу, прикрепите файл или вставьте фото…',
    'Describe the task, attach a file or paste a photo…'
  ],
  'c.placeholderNoKey': [
    'Сначала подключите модель и API-ключ…',
    'Connect a model and an API key first…'
  ],
  'c.attach': ['Прикрепить файл или фото', 'Attach a file or photo'],
  'c.screenshot': ['Снять экран и прикрепить', 'Capture the screen and attach it'],
  'c.send': ['Отправить', 'Send'],
  'c.stop': ['Остановить', 'Stop'],
  'c.compacting': ['Сжимаю контекст', 'Compacting context'],
  'c.needsKey': ['Нужен API-ключ', 'API key needed'],
  'c.effort': ['Мощность', 'Effort'],
  'c.thinking': ['Thinking', 'Thinking'],
  'c.thinkingEffort': ['Уровень размышлений', 'Thinking effort'],
  'c.effortLevels': ['{n} уровень|{n} уровня|{n} уровней', '{n} level|{n} levels'],
  'c.effortInfo': [
    'Показаны только уровни, которые реально принимает API выбранной модели.',
    'Only levels the selected model actually accepts over its API are shown.'
  ],
  'c.effortFoot': [
    'Подписи и число ступеней задаёт выбранная модель.',
    'The selected model defines the names and number of levels.'
  ],
  'c.dropHere': [
    'Отпустите файлы или фото — прикреплю их к сообщению',
    'Drop files or photos to attach them'
  ],
  'c.agentFiles': ['Файлы агента', 'Files from the agent'],
  'c.openFolder': ['Показать в папке', 'Reveal in folder'],

  'run.doing': ['Выполняю', 'Working'],
  'run.done': ['Выполнено', 'Done'],
  'run.failed': ['С ошибками', 'With errors'],
  'run.step': ['Шаг {n}', 'Step {n}'],
  'run.changed': ['изменён|изменено|изменено', 'changed'],
  'run.opinion': ['Второе мнение', 'Second opinion'],
  'run.opinionHint': [
    'Другая модель проверит последний ответ на ошибки и упущения',
    'Another model reviews the last answer for mistakes and gaps'
  ],
  'run.opinionTitle': ['Второе мнение', 'Second opinion'],
  'run.opinionLoading': ['Другая модель проверяет ответ…', 'Another model is reviewing the answer…'],
  'run.opinionFrom': ['{model} · {provider}', '{model} · {provider}'],
  'run.opinionFailed': [
    'Не удалось получить второе мнение.',
    'Could not get a second opinion.'
  ],
  'run.opinionClose': ['Закрыть второе мнение', 'Close the second opinion'],

  'chat.thinking': ['Думаю над задачей', 'Thinking about the task'],
  'chat.planning': ['Составляю план', 'Drafting the plan'],
  'chat.stopped': ['Ответ остановлен вами.', 'Answer stopped by you.'],
  'chat.projectOpened': ['Агент открыл проект «{name}».', 'The agent opened the project “{name}”.'],
  'chat.answered': ['Вы ответили: «{answer}»', 'You answered “{answer}”'],
  'chat.questionSkipped': ['Вы пропустили вопрос агента.', 'You skipped the agent question.'],
  'chat.compacting': ['Сжимаю контекст', 'Compacting context'],
  'chat.compacted': ['Контекст сжат', 'Context compacted'],
  'chat.compactFailed': ['Не удалось сжать полностью', 'Compaction was incomplete'],
  'chat.compactAuto': ['контекст заполнен — освобождаю место', 'context is full — freeing space'],
  'chat.compactManual': ['сжимаю историю по запросу', 'compacting history on request'],
  'chat.groupDid': ['Выполнил', 'Ran'],
  'chat.groupDoing': ['Выполняю', 'Running'],
  'chat.duration': ['{n} с', '{n} s'],
  'chat.errorsSuffix': ['ошибки', 'errors'],
  'chat.file': ['файл', 'file'],
  'chat.attachmentOnly': ['Прикреплённые файлы', 'Attached files'],
  'chat.imageOnly': ['Прикреплённые изображения', 'Attached images'],
  'chat.openImage': ['Открыть изображение', 'Open image'],
  'chat.fileWork': ['Работа с файлами', 'Working with files'],
  'chat.working': ['Работаю', 'Working'],
  'chat.subagent': ['Подзадача', 'Subtask'],
  'chat.image': ['Изображение', 'Image'],
  'chat.imageLoading': ['Загружаю изображение…', 'Loading image…'],
  'chat.imageFailed': ['Не удалось показать изображение', 'Could not display the image'],
  'chat.imageOpen': ['Открыть изображение', 'Open image'],
  'chat.imageReveal': ['Показать в папке', 'Show in folder'],
  'chat.imageClose': ['Закрыть изображение', 'Close image'],
  'tool.read': ['Читает файл', 'Reading file'],
  'tool.write': ['Записывает файл', 'Writing file'],
  'tool.list': ['Смотрит папку', 'Listing folder'],
  'tool.search': ['Ищет по проекту', 'Searching the project'],
  'tool.skill': ['Берёт скил', 'Loading skill'],
  'tool.project': ['Открывает проект', 'Opening project'],
  'tool.screen': ['Снимает экран', 'Capturing the screen'],
  'tool.ask': ['Задаёт вопрос', 'Asking you'],
  'tool.agent': ['Подключает агента', 'Running subagent'],
  'tool.image': ['Рисует изображение', 'Generating image'],
  'tool.unknown': ['Инструмент', 'Tool'],

  'q.title': ['Вопрос от агента', 'A question from the agent'],
  'q.options': ['Быстрые ответы', 'Quick answers'],
  'q.other': ['Свой вариант', 'Own words'],
  'q.otherPh': ['Написать ответ…', 'Write an answer…'],
  'q.send': ['Ответить', 'Answer'],
  'q.skip': ['Пропустить', 'Skip'],
  'q.foot': [
    'Агент ждёт ответ и продолжит сам.',
    'The agent waits for the answer and continues on its own.'
  ],

  'act.streak': ['{n} {day}', '{n} {day}'],
  'act.silence': ['{date} — тишина', '{date} — nothing'],
  'act.empty': [
    'Здесь появится карта задач за выбранный сезон',
    'Your activity for the selected season will appear here'
  ],
  'act.less': ['Меньше', 'Less'],
  'act.more': ['Больше', 'More'],
  'act.spring': ['Весна', 'Spring'],
  'act.summer': ['Лето', 'Summer'],
  'act.autumn': ['Осень', 'Autumn'],
  'act.winter': ['Зима', 'Winter'],
  'act.prevSeason': ['Предыдущий сезон', 'Previous season'],
  'act.nextSeason': ['Следующий сезон', 'Next season'],
  'act.seasonOf': ['{season} {year}', '{season} {year}'],
  'act.summary': [
    '{messages} · {steps} · {writes}',
    '{messages} · {steps} · {writes}'
  ],
  'act.stats': [
    '{active} активных дней · лучшая серия {streak} · максимум {busiest} за день',
    '{active} active days · best streak {streak} · peak {busiest} in a day'
  ],
  'act.tooltip': [
    '{date} — {messages}, {steps}, {writes}',
    '{date} — {messages}, {steps}, {writes}'
  ],
  'unit.message': ['{n} сообщение|{n} сообщения|{n} сообщений', '{n} message|{n} messages'],
  'unit.step': ['{n} шаг|{n} шага|{n} шагов', '{n} step|{n} steps'],
  'unit.write': ['{n} запись|{n} записи|{n} записей', '{n} write|{n} writes'],
  'unit.task': ['{n} задача|{n} задачи|{n} задач', '{n} task|{n} tasks'],
  'unit.tool': [
    '{n} инструмент|{n} инструмента|{n} инструментов',
    '{n} tool|{n} tools'
  ],
  'unit.file': ['{n} файл|{n} файла|{n} файлов', '{n} file|{n} files'],
  'unit.error': ['{n} ошибка|{n} ошибки|{n} ошибок', '{n} error|{n} errors'],
  'unit.day': ['день|дня|дней', 'day|days'],
  'unit.skill': ['{n} навык|{n} навыка|{n} навыков', '{n} skill|{n} skills'],
  'unit.agent': ['{n} агент|{n} агента|{n} агентов', '{n} agent|{n} agents'],

  'ctx.button': [
    'Контекст: осталось {left} из {limit} токенов. Автосжатие при {threshold}%~',
    'Context: {left} of {limit} tokens left. Auto-compact at {threshold}%.'
  ],
  'ctx.loading': ['Контекст загружается…', 'Loading context…'],
  'ctx.title': ['Окно контекста', 'Context window'],
  'ctx.sub': ['текущая задача · приблизительная оценка', 'current task · rough estimate'],
  'ctx.desc': [
    'Показывает, сколько контекста занимает задача. При заполнении на {threshold}% ранние сообщения автоматически сжимаются в сводку.',
    'How much context this task uses. At {threshold}% the oldest messages are automatically compacted into a summary.'
  ],
  'ctx.used': ['использовано', 'used'],
  'ctx.left': ['осталось', 'left'],
  'ctx.limit': ['лимит модели', 'model limit'],
  'ctx.compactNow': ['Сжать контекст сейчас', 'Compact context now'],
  'ctx.compacting': ['Сжимаю историю…', 'Compacting history…'],

  'load.title': ['Загруженность модели', 'Model load'],
  'load.idle': ['модель свободна', 'model idle'],
  'load.working': ['ответ идёт', 'streaming'],
  'load.tps': ['{n} ток/с', '{n} tok/s'],
  'load.first': ['первый токен {n} мс', 'first token {n} ms'],
  'load.latency': ['задержка {n} мс', 'latency {n} ms'],
  'load.inflight': ['{n} активный запрос', '{n} active request'],
  'load.desc': [
    'Замер в реальном времени: время до первого токена, скорость генерации и число активных запросов к провайдеру.',
    'Live measurement: time to first token, generation speed and how many requests the provider is handling.'
  ],
  'load.chars': ['{n} символ|{n} символа|{n} символов', '{n} char|{n} chars'],
  'load.requests': ['{n} запрос|{n} запроса|{n} запросов', '{n} request|{n} requests'],

  'a.title': ['Подтверждение изменения файла', 'Confirm file change'],
  'a.outsideTitle': ['Доступ вне папки проекта', 'Access outside the project'],
  'a.newFile': ['Новый файл — проверьте diff перед применением', 'New file — review the diff before applying'],
  'a.changeFile': ['Изменение файла — проверьте diff', 'File change — review the diff'],
  'a.outsideRead': [
    'Агент хочет прочитать файл за пределами проекта. Разрешение действует один раз.',
    'The agent wants to read a file outside your project. This grants a one-time read.'
  ],
  'a.outsideWrite': [
    'Агент хочет изменить файл за пределами проекта. Проверьте diff перед применением.',
    'The agent wants to change a file outside your project. Review the diff before applying.'
  ],
  'a.allow': ['Разрешить', 'Allow'],
  'a.allowOnce': ['Разрешить один раз', 'Allow once'],
  'a.allowAlways': ['Всегда разрешать эту папку', 'Always allow this folder'],
  'a.deny': ['Отклонить', 'Deny'],
  'a.apply': ['Применить изменения', 'Apply changes'],
  'a.footNote': [
    'Файл будет записан только после подтверждения. Отклонённую правку агент не применяет.',
    'The file is written only after you confirm. A rejected edit is never applied.'
  ],
  'a.outsideFoot': [
    'Разрешение «всегда» можно отозвать в настройках, раздел «Доступы».',
    'You can revoke an "always" grant later in Settings → Access.'
  ],
  'a.added': ['+{n}', '+{n}'],
  'a.removed': ['-{n}', '-{n}'],
  'a.imageTitle': ['Сохранение изображения', 'Save generated image'],
  'a.image': [
    'Модель сгенерировала изображение — проверьте и подтвердите сохранение',
    'The model generated an image — review it before saving'
  ],
  'a.imageOutside': [
    'Изображение будет сохранено за пределами проекта',
    'The image will be saved outside the project'
  ],
  'a.imageFoot': [
    'Файл появится на диске только после подтверждения. Отклонённое изображение не сохраняется.',
    'The file is written only after you confirm. A rejected image is never saved.'
  ],
  'a.saveImage': ['Сохранить изображение', 'Save image'],

  's.title': ['Настройки', 'Settings'],
  's.sectionApp': ['Приложение', 'Application'],
  's.sectionGeneral': ['Основные', 'General'],
  's.sectionAppearance': ['Оформление', 'Appearance'],
  's.sectionBehavior': ['Поведение агента', 'Agent behavior'],
  's.sectionProviders': ['Провайдеры', 'Providers'],
  's.sectionModels': ['Модели', 'Models'],
  's.sectionProjects': ['Проекты', 'Projects'],
  's.sectionAccess': ['Доступы', 'Access'],
  's.sectionSkills': ['Skills', 'Skills'],
  's.sectionAgents': ['Агенты', 'Agents'],
  's.sectionKeys': ['API-ключи', 'API keys'],
  's.general': [
    'Язык интерфейса и хранение данных на устройстве.',
    'Interface language and on-device data.'
  ],
  's.language': ['Язык интерфейса', 'Interface language'],
  's.appearanceTitle': ['Тема и оформление', 'Theme and appearance'],
  's.appearanceNote': [
    'Графитовая тема и тёмно-серый акцент включены по умолчанию. Всё применяется сразу.',
    'Graphite theme and a charcoal accent are the defaults. Everything applies instantly.'
  ],
  's.windowType': ['Тип окна', 'Window layout'],
  's.windowTypeHint': [
    'Мини-терминал открывает компактное окно с настоящей оболочкой PowerShell и вкладкой агента. Настройки и подтверждения открываются внутри него.',
    'Mini terminal opens a compact window with a real PowerShell shell and an agent tab. Settings and approvals open right inside it.'
  ],
  's.window.app': ['Приложение', 'Application'],
  's.window.appHint': ['шапка, сайдбар и полный чат', 'header, sidebar and full chat'],
  's.window.terminal': ['Мини-терминал', 'Mini terminal'],
  's.window.terminalHint': ['компактное окно с терминалом', 'compact terminal-style window'],
  'term.openApp': ['Открыть в приложении', 'Open in the app'],
  'term.ready': ['Готов к работе.', 'Ready.'],
  'term.hint': [
    'Опишите задачу и нажмите Enter. Модель, мощность и проект — ниже.',
    'Type a task and press Enter. Model, effort and project live below.'
  ],
  'term.noProject': ['проект не выбран — папка откроется по клику', 'no project — click to pick a folder'],
  'term.connect': ['подключите модель в настройках', 'connect a model in settings'],
  'term.settingsHint': ['Настройки и подтверждения открываются внутри окна.', 'Settings and approvals open inside this window.'],
  'term.model': ['модель', 'model'],
  'term.project': ['проект', 'project'],
  'term.keySend': ['отправить', 'send'],
  'term.keyNewline': ['новая строка', 'new line'],
  'term.tabAgent': ['Агент', 'Agent'],
  'term.tabShell': ['Терминал', 'Shell'],
  'term.shellHint': ['Настоящая оболочка PowerShell в папке проекта.', 'A real PowerShell in the project folder.'],
  'term.shellStarting': ['Запускаю оболочку…', 'Starting the shell…'],
  'term.shellExited': ['Оболочка завершилась. Перезапустить?', 'The shell exited. Restart?'],
  'term.shellRestart': ['Перезапустить', 'Restart'],
  'term.shellClear': ['Очистить', 'Clear'],
  'term.shellNew': ['Новая вкладка', 'New tab'],
  'term.shellOpen': ['Открыть терминал', 'Open terminal'],
  's.theme': ['Тема', 'Theme'],
  's.theme.graphite': ['Графит', 'Graphite'],
  's.theme.graphiteHint': ['тёмно-серый', 'dark grey'],
  's.theme.midnight': ['Полночь', 'Midnight'],
  's.theme.midnightHint': ['глубокий синий', 'deep blue'],
  's.theme.light': ['Светлая', 'Light'],
  's.theme.lightHint': ['бумажный беж', 'paper beige'],
  's.accent': ['Акцент', 'Accent'],
  's.accent.graphite': ['Тёмно-серый', 'Charcoal'],
  's.accent.lime': ['Лайм', 'Lime'],
  's.accent.violet': ['Фиолетовый', 'Violet'],
  's.accent.blue': ['Синий', 'Blue'],
  's.accent.rose': ['Розовый', 'Rose'],
  's.accent.amber': ['Янтарный', 'Amber'],
  's.uiScale': ['Масштаб интерфейса', 'Interface scale'],
  's.uiScaleHint': [
    'Крупнее текст, кнопки и чат. 100% — родной размер окна.',
    'Larger text, buttons and chat. 100% is the native window size.'
  ],
  's.motion': ['Анимации', 'Motion'],
  's.motion.full': ['Полные', 'Full'],
  's.motion.calm': ['Спокойные', 'Calm'],
  's.motionHint': [
    'Спокойный режим убирает всплывающие окна, бегущие точки и плавные переходы.',
    'Calm mode drops pop-over springs, travelling dots and sliding transitions.'
  ],
  's.density': ['Плотность', 'Density'],
  's.density.comfy': ['Просторно', 'Comfortable'],
  's.density.compact': ['Компактно', 'Compact'],
  's.densityHint': [
    'Компактный режим уменьшает отступы в чате и сайдбаре.',
    'Compact mode tightens spacing in chat and the sidebar.'
  ],
  's.opinionTitle': ['Второе мнение', 'Second opinion'],
  's.opinionNote': [
    'Какая модель оспаривает ответ агента в кнопке «Второе мнение».',
    'Which model disputes the agent answer behind the Second opinion button.'
  ],
  's.opinionModel': ['Модель-рецензор', 'Reviewer model'],
  's.opinionAuto': ['Авто', 'Auto'],
  's.opinionAutoSub': ['другая модель', 'another model'],
  's.opinionNone': ['Сначала подключите провайдера с текстовой моделью.', 'Connect a provider with a text model first.'],
  's.approvalTitle': ['Подтверждения', 'Approvals'],
  's.approvalNote': [
    'Когда агент спрашивает разрешение перед записью файлов.',
    'When the agent asks before writing files.'
  ],
  's.behaviorNote': [
    'Подтверждения записи, модель-рецензор и момент автосжатия контекста.',
    'Write approvals, the reviewer model and when context gets compacted.'
  ],
  's.approval.always': ['Всегда спрашивать', 'Always ask'],
  's.approval.alwaysDesc': [
    'Каждая запись показывает diff и ждёт подтверждения.',
    'Every write shows a diff and waits for confirmation.'
  ],
  's.approval.smart': ['Только важное', 'Important only'],
  's.approval.smartDesc': [
    'Мелкие правки в существующих файлах проходят сами; новые файлы, конфиги и крупные изменения спрашивают.',
    'Small edits to existing files go through; new files, configs and large changes still ask.'
  ],
  's.approval.never': ['Без разрешений', 'No approvals'],
  's.approval.neverDesc': [
    'Запись внутри проекта не спрашивает. Папки вне проекта всё равно требуют доступа.',
    'Writes inside the project never ask. Folders outside the project still need a grant.'
  ],
  's.compactTitle': ['Автосжатие контекста', 'Auto-compaction'],
  's.compactNote': [
    'История сжимается в сводку, когда контекст заполнен до выбранного процента. Минимум зависит от окна модели — чтобы хватило места для самой сводки.',
    'History is compacted into a summary when the context reaches the chosen percent. The minimum depends on the model window so the summary itself fits.'
  ],
  's.compactAt': ['Сжимать при {n}%', 'Compact at {n}%'],
  's.compactRange': [
    'Для этой модели доступно {min}–{max}%',
    'Available range for this model: {min}–{max}%'
  ],
  's.compactContext': [
    'Окно {limit} · сейчас занято {used}',
    'Window {limit} · currently {used}'
  ],
  's.providersTitle': ['Подключённые провайдеры', 'Connected providers'],
  's.popularTitle': ['Популярные провайдеры', 'Popular providers'],
  's.noneProviders': [
    'Пока нет ни одного провайдера. Выберите шаблон выше, вставьте свой API-ключ и сохраните.',
    'No providers yet. Pick a preset above, paste your own API key and save.'
  ],
  's.addProvider': ['Добавить провайдера', 'Add a provider'],
  's.addProviderSub': [
    'любой OpenAI-совместимый API, Anthropic или локальная Ollama',
    'any OpenAI-compatible API, Anthropic or local Ollama'
  ],
  's.proxyTitle': ['Прокси', 'Proxy'],
  's.proxyNote': [
    'Запросы к провайдеру пойдут через ваш прокси - так открываются модели, которые не отвечают из вашего региона.',
    'Provider requests go through your proxy, which opens up models that stay silent from your region.'
  ],
  's.proxyLabel': ['Адрес прокси', 'Proxy address'],
  's.proxyApply': ['Применить', 'Apply'],
  's.proxyClear': ['Выключить', 'Turn off'],
  's.proxyOn': ['Сейчас через {url}', 'Now through {url}'],
  's.proxyOff': ['Сейчас напрямую', 'Currently direct'],
  's.proxyHint': [
    'Подойдёт любой HTTP-прокси, например от Clash или v2rayN. Ключ и текст запроса проходят через него, поэтому доверяйте только своему.',
    'Any HTTP proxy works, for example the one from Clash or v2rayN. Your key and prompt text pass through it, so trust it first.'
  ],
  's.proxyGeo': [
    'Без прокси из РФ и РБ обычно не отвечают OpenAI и Anthropic; бесплатные модели, OpenRouter и локальные провайдеры работают напрямую.',
    'Without a proxy, OpenAI and Anthropic usually stay silent from RF and RB; the free models, OpenRouter and local providers answer directly.'
  ],
  's.custom': ['Свой провайдер', 'Custom provider'],
  's.presetOllama': ['Ollama (локально)', 'Ollama (local)'],
  's.label': ['Название', 'Name'],
  's.baseUrl': ['Base URL', 'Base URL'],
  's.apiKey': ['API-ключ', 'API key'],
  's.apiKeyStored': ['ключ сохранён', 'key saved'],
  's.apiKeyHint': [
    'Хранится в зашифрованном виде на этом компьютере и никуда не отправляется, кроме вашего API.',
    'Stored encrypted on this machine and sent only to your own API endpoint.'
  ],
  's.modelList': ['Список моделей', 'Model list'],
  's.modelListHint': [
    'По одному id в строке. Кнопка ниже подтянет список из API.',
    'One model id per line. The button below pulls the list from the API.'
  ],
  's.fetchModels': ['Загрузить модели', 'Load models'],
  's.fetched': ['Моделей: {n}', '{n} models'],
  's.remove': ['Удалить', 'Remove'],
  's.clearKey': ['Убрать ключ', 'Clear key'],
  's.save': ['Сохранить', 'Save'],
  's.saved': ['Сохранено', 'Saved'],
  's.cancel': ['Отмена', 'Cancel'],
  's.close': ['Закрыть настройки', 'Close settings'],
  's.footNote': [
    'Запросы уходят с вашего компьютера напрямую провайдеру — своего сервера у нас нет.',
    'API calls go straight from your machine to the provider — we run no server of our own.'
  ],
  's.activeModel': ['Активная модель', 'Active model'],
  's.pickModel': ['Выбрать модель', 'Pick a model'],
  's.searchModels': ['Поиск по моделям', 'Search models'],
  's.noModelsFound': ['Ничего не найдено', 'Nothing found'],
  's.modelPrefixHint': [
    'Имя слева — как модель называется у провайдера, крупным — привычное название.',
    'The small line is the raw provider id, the bold line is the readable name.'
  ],
  's.projectsTitle': ['Проекты', 'Projects'],
  's.projectsHint': [
    'Каждый проект хранит свою историю диалога и контекст. Переключение — мгновенное.',
    'Every project keeps its own conversation and context. Switching is instant.'
  ],
  's.addProject': ['Добавить папку', 'Add a folder'],
  's.active': ['активен', 'active'],
  's.makeActive': ['Сделать активным', 'Make active'],
  's.missing': ['папка недоступна', 'folder unavailable'],
  's.accessTitle': ['Доступ за пределы проекта', 'Access outside the project'],
  's.accessHint': [
    'По умолчанию агент работает только внутри выбранной папки. Если нужен другой каталог, он спросит разрешение — «всегда» добавит его в этот список.',
    'By default the agent stays inside the selected folder. If it needs another directory it asks — choosing "always" adds it here.'
  ],
  's.accessNone': [
    'Нет сохранённых разрешений вне проекта.',
    'No saved permissions outside the project.'
  ],
  's.revoke': ['Отозвать', 'Revoke'],
  's.skillsTitle': ['Skills', 'Skills'],
  's.skillsHint': [
    'Папка со SKILL.md-инструкциями. Включённые скилы попадают в системный промпт агента.',
    'A folder of SKILL.md playbooks. Enabled skills are injected into the agent system prompt.'
  ],
  's.openSkills': ['Открыть папку skills', 'Open skills folder'],
  's.noSkills': [
    'Пока нет ни одного скила. Создайте папку/skill.md и нажмите «обновить».',
    'No skills yet. Create a folder with skill.md and press refresh.'
  ],
  's.agentsTitle': ['Агенты', 'Agents'],
  's.agentsHint': [
    'Готовые роли-субагенты (md с name/description). Агент может делегировать им подзадачу.',
    'Reusable subagent roles (md files with name/description). The agent can delegate subtasks to them.'
  ],
  's.openAgents': ['Открыть папку агентов', 'Open agents folder'],
  's.noAgents': [
    'Пока нет ни одного агента. Добавьте .md файлы в папку агентов.',
    'No agents yet. Add .md files to the agents folder.'
  ],
  's.refresh': ['Обновить список', 'Refresh list'],
  's.enabled': ['включён', 'enabled'],
  's.disabled': ['выключен', 'disabled'],

  'unit.b': ['Б', 'B'],
  'unit.kb': ['КБ', 'KB'],
  'unit.mb': ['МБ', 'MB'],
  'unit.model': ['{n} модель|{n} модели|{n} моделей', '{n} model|{n} models'],

  'task.switchFolder': ['Сменить папку проекта', 'Switch project folder'],
  'task.compact': ['Сжать контекст', 'Compact context'],

  'c.local': ['Локально', 'Local'],
  'c.ariaWorkspace': ['Рабочее пространство', 'Workspace'],
  'c.ariaMessage': ['Сообщение агенту', 'Message to the agent'],
  'c.ariaFiles': ['Файлы и фото для контекста', 'Files and photos for context'],
  'c.removeFile': ['Убрать файл {name}', 'Remove {name}'],
  'c.needsSetup': [
    'Добавьте провайдера и API-ключ, чтобы отправить задачу.',
    'Add a provider and an API key to send a task.'
  ],

  'mp.providerNone': ['Провайдер не выбран', 'No provider selected'],
  'mp.title': ['Модель', 'Model'],
  'mp.hint': ['выбор для нового сообщения', 'applies to the next message'],
  'mp.manage': ['Настроить провайдеров и ключи', 'Manage providers and keys'],
  'mp.imageBadge': ['фото', 'image'],
  'mp.thinkingBadge': ['thinking', 'thinking'],

  'a.diffEmpty': ['Содержимое файла не изменится.', 'The file content does not change.'],
  'a.truncated': ['Показаны первые {n} строк diff.', 'Showing the first {n} diff lines.'],

  's.kind': ['Тип API', 'API type'],
  's.kindOpenai': ['OpenAI-совместимый', 'OpenAI-compatible'],
  's.kindAnthropic': ['Anthropic', 'Anthropic'],
  's.providerNamePlaceholder': ['Название провайдера', 'Provider name'],
  's.defaultProvider': ['Провайдер', 'Provider'],
  's.apiKeyKeep': ['Оставьте пустым, чтобы не менять', 'Leave empty to keep it'],
  's.apiKeyNew': ['Новый ключ (необязательно)', 'New key (optional)'],
  's.apiKeyPaste': ['Вставьте API-ключ', 'Paste your API key'],
  's.apiKeyCleared': [
    'Сохранённый ключ будет удалён после сохранения.',
    'The stored key is removed when you save.'
  ],
  's.localKeyNote': [
    'Для локальных моделей ключ можно оставить пустым.',
    'Local models do not need a key.'
  ],
  's.loadingModels': ['Загружаю…', 'Loading…'],
  's.emptyModelList': [
    'Провайдер вернул пустой список — впишите модели вручную.',
    'The API returned no models — add them by hand.'
  ],
  's.noBaseUrlForFetch': ['Сначала укажите Base URL.', 'Set a Base URL first.'],
  's.saving': ['Сохраняю…', 'Saving…'],
  's.edit': ['Изменить', 'Edit'],
  's.providerCount': ['{n} подключено', '{n} connected'],
  's.removeProvider': ['Удалить провайдера {name}', 'Remove {name}'],
  's.keyMissing': ['без ключа', 'no key'],
  's.freeBadge': ['бесплатно', 'free'],
  's.freeNote': [
    'Ключ не нужен — модели работают сразу после установки. Запросы уходят не вендору, а стороннему шлюзу, поэтому текст задачи видит его оператор; лимит примерно 200 запросов в час с одного IP.',
    'No key needed — these models work straight after install. Requests go to a third-party gateway rather than the vendor, so its operator sees your prompt; the limit is roughly 200 requests per hour per IP.'
  ],
  's.unsaved': ['Есть несохранённые правки — нажмите «Сохранить».', 'Unsaved changes — press Save.'],
  's.languageHint': [
    'Меняет язык всего интерфейса сразу, без перезапуска.',
    'Switches the whole interface at once, no restart needed.'
  ],
  's.modelsHint': [
    'Все модели ваших провайдеров в одном списке. Крупным — привычное имя, мелким — id у провайдера.',
    'Every model from your providers in one list. Bold is the readable name, small is the provider id.'
  ],
  's.noModelsYet': [
    'Сначала добавьте провайдера с моделями во вкладке «Провайдеры».',
    'Add a provider with models in the Providers tab first.'
  ],
  's.noProjects': [
    'Пока нет проектов. Добавьте папку — у каждого проекта своя история диалога.',
    'No projects yet. Add a folder — every project keeps its own conversation.'
  ],
  's.sourceGlobal': ['глобально', 'global'],
  's.sourceProject': ['в проекте', 'in project'],
  's.default': ['по умолчанию', 'default'],
  's.makeDefault': ['Сделать активным', 'Make active'],
  's.openFile': ['Открыть файл', 'Open file'],

  'p.hello': ['Привет! Что ты умеешь?', 'Hi! What can you do?'],
  'w.suggHello': ['Привет! Что ты умеешь?', 'Hi! What can you do?'],
  'w.suggHelloDesc': ['Коротко о возможностях агента', 'A short tour of what the agent does'],
  'p.keys': ['Как настроить API-ключ?', 'How do I set up an API key?'],
  'w.suggKeys': ['Как настроить API-ключ?', 'How do I set up an API key?'],
  'w.suggKeysDesc': ['Провайдеры, модели и безопасность', 'Providers, models and safety'],
  'p.planOwn': ['Помоги спланировать мой проект', 'Help me plan my project'],
  'w.suggOwn': ['Помоги спланировать проект', 'Help plan a project'],
  'w.suggOwnDesc': ['От идеи до структуры файлов', 'From idea to file layout'],

  'sys.trimmed': [
    '[История диалога была автоматически сокращена, чтобы освободить контекст. Самые ранние сообщения удалены.]',
    '[The conversation history was automatically shortened to free context. The earliest messages were removed.]'
  ],
  'sys.ackTrim': [
    'Понял. Продолжаю работу с учётом оставшейся части диалога.',
    'Understood. I continue with the remaining part of the conversation.'
  ],
  'sys.summary': [
    'Сводка предыдущей части диалога (сжата автоматически):',
    'Summary of the earlier part of the conversation (compacted automatically):'
  ],
  'sys.ackSummary': [
    'Принял сводку. Продолжаю с учётом контекста выше.',
    'Summary accepted. I continue with the context above.'
  ],
  'sys.summaryRequest': [
    'Сожми приведённый диалог в техническую сводку.',
    'Compress the conversation below into a technical summary.'
  ],
  'sys.attachments': [
    'Посмотри прикреплённые файлы и предложи, что с ними можно сделать.',
    'Look at the attached files and suggest what can be done with them.'
  ],
  'sys.images': [
    'Посмотри прикреплённые изображения и учти, что на них показано.',
    'Look at the attached images and use what they show.'
  ],
  'sys.attachment': [
    'Вложенный файл: {name} ({size} байт)',
    'Attached file: {name} ({size} bytes)'
  ],
  'sys.projectTitle': ['Папка проекта', 'Project folder'],
  'sys.selectProject': ['Выберите папку проекта', 'Choose a project folder'],
  'sys.openProject': ['Открыть проект', 'Open project'],

  'e.emptySummary': ['Провайдер вернул пустую сводку.', 'The provider returned an empty summary.'],
  'e.noOpinion': [
    'Нужен хотя бы один завершённый ответ агента, чтобы запросить второе мнение.',
    'Need at least one finished agent answer to ask for a second opinion.'
  ],
  'e.noSecondModel': [
    'Для второго мнения нужна ещё одна подключённая модель.',
    'A second opinion needs another connected model.'
  ],
  'e.running': ['Агент уже отвечает. Остановите его, чтобы отправить новое сообщение.', 'The agent is already answering. Stop it to send a new message.'],
  'e.stopFirst': ['Сначала остановите агента.', 'Stop the agent first.'],
  'e.waitAnswer': ['Сначала дождитесь завершения ответа.', 'Wait for the current answer to finish.'],
  'e.waitAction': ['Сначала дождитесь завершения текущего действия.', 'Wait for the current action to finish.'],
  'e.emptyMessage': ['Пустое сообщение.', 'Empty message.'],
  'e.badAttachments': ['Некорректные вложения.', 'Invalid attachments.'],
  'e.tooManyAttachments': ['Можно прикрепить не больше {n} файлов.', 'You can attach at most {n} files.'],
  'e.binaryFile': ['Файл «{name}» выглядит бинарным — прикрепляйте текстовые файлы.', 'File "{name}" looks binary — attach text files only.'],
  'e.fileTooBig': ['Файл «{name}» больше {n} КБ.', 'File "{name}" is larger than {n} KB.'],
  'e.totalTooBig': ['Суммарный размер вложений слишком большой.', 'Total attachment size is too large.'],
  'e.notText': [
    '«{name}» не похож на текстовый файл — пока поддерживаются код и текст.',
    '"{name}" does not look like a text file — code and text only for now.'
  ],
  'e.readFail': ['Не удалось прочитать «{name}».', 'Could not read "{name}".'],
  'e.imageRead': ['Не удалось прочитать фото «{name}».', 'Could not read photo "{name}".'],
  'e.imageFormat': [
    '«{name}» не поддерживается. Нужен PNG, JPEG, WebP или GIF.',
    '"{name}" is not supported. Use PNG, JPEG, WebP or GIF.'
  ],
  'e.imageAttachBig': [
    'Фото «{name}» слишком большое даже после сжатия.',
    'Photo "{name}" is too large even after compression.'
  ],
  'e.tooBigContext': [
    'Файл «{name}» слишком большой для контекста.',
    'File "{name}" is too large for the context.'
  ],
  'e.noProvider': ['Провайдер не найден. Откройте настройки и добавьте провайдера.', 'Provider not found. Open settings and add a provider.'],
  'e.noProviderActive': ['Сначала выберите провайдера и модель.', 'Pick a provider and a model first.'],
  'e.noModel': ['Укажите модели в настройках провайдера.', 'Add models in the provider settings.'],
  'e.modelNotListed': ['Выбранной модели нет у провайдера. Обновите настройки.', 'That model is not listed for this provider. Refresh the settings.'],
  'e.badModel': ['Некорректная модель.', 'Invalid model.'],
  'e.badProviderKind': ['Некорректный тип провайдера.', 'Invalid provider type.'],
  'e.badSettings': ['Некорректные настройки.', 'Invalid settings.'],
  'e.badBaseUrl': ['Укажите Base URL для каждого провайдера.', 'Set a Base URL for every provider.'],
  'e.badBaseUrlValue': ['Некорректный Base URL: {value}', 'Invalid Base URL: {value}'],
  'e.noBaseUrl': ['Base URL не указан.', 'Base URL is missing.'],
  'e.fetchModels': ['Не удалось получить список моделей: {reason}', 'Could not load the model list: {reason}'],
  'e.connect': ['Не удалось подключиться к {host}: {reason}', 'Could not connect to {host}: {reason}'],
  'e.badProxy': [
    'Прокси - это http:// или https:// адрес вида http://127.0.0.1:7890',
    'A proxy is an http:// or https:// address like http://127.0.0.1:7890'
  ],
  'e.geoHint': [
    'провайдер не отвечает из вашего региона: возьмите бесплатную модель, добавьте зеркальный шлюз или включите прокси в настройках',
    'the provider does not answer from your region: pick a free model, add a mirror gateway, or turn on the proxy in settings'
  ],
  'e.providerError': ['Провайдер вернул ошибку.', 'The provider returned an error.'],
  'e.emptyResponse': ['Сервер вернул пустой ответ.', 'The server returned an empty response.'],
  'e.stepLimit': ['Агент достиг лимита шагов. Уточните задачу и попробуйте снова.', 'The agent hit its step limit. Narrow the task and try again.'],
  'e.noProjectFolder': ['Папка проекта не выбрана. Попросите пользователя выбрать папку.', 'No project folder is selected. Ask the user to pick a folder.'],
  'e.pathRequired': ['Нужен путь к файлу.', 'A file path is required.'],
  'e.noAccess': ['Доступ к пути отклонён пользователем.', 'Access to that path was denied by the user.'],
  'e.noScreen': ['Не удалось получить снимок экрана.', 'Could not capture the screen.'],
  'e.screenUnavailable': [
    'Захват экрана недоступен в этом запуске.',
    'Screen capture is not available in this run.'
  ],
  'e.noQuestion': ['Вопрос пустой.', 'The question is empty.'],
  'e.noAsk': ['Этот запуск не может задавать вопросы.', 'This run cannot ask the user questions.'],
  'e.notFound': ['Файл не найден: {path}', 'File not found: {path}'],
  'e.folderNotFound': ['Папка не найдена: {path}', 'Folder not found: {path}'],
  'e.notAFile': ['Это не файл: {path}', 'Not a file: {path}'],
  'e.notAFolder': ['Это не папка: {path}', 'Not a folder: {path}'],
  'e.tooLargeRead': ['Файл слишком большой для чтения ({n} КБ).', 'File is too large to read ({n} KB).'],
  'e.tooLargeEdit': ['Существующий файл слишком большой для правки агентом.', 'The existing file is too large for the agent to edit.'],
  'e.binary': ['Бинарные файлы не поддерживаются.', 'Binary files are not supported.'],
  'e.mustBeFile': ['Путь должен указывать на файл.', 'The path must point to a file.'],
  'e.badContent': ['content должен быть строкой.', 'content must be a string.'],
  'e.badAgentName': ['Неизвестный агент: {name}', 'Unknown agent: {name}'],
  'e.badSkillName': ['Неизвестный скил: {name}', 'Unknown skill: {name}'],
  'e.noProjects': [
    'Пользователь ещё не добавил проекты.',
    'The user has not registered any projects.'
  ],
  'e.unknownProject': ['Неизвестный проект: {name}', 'Unknown project: {name}'],
  'e.emptyTask': ['Нужно описать подзадачу.', 'A subtask description is required.'],
  'e.badSearch': ['Нужен текст поиска.', 'A search pattern is required.'],
  'e.imagePrompt': ['Опишите, какое изображение сгенерировать.', 'Describe the image to generate.'],
  'e.imagePromptLong': [
    'Описание изображения длиннее {n} символов.',
    'The image prompt is longer than {n} characters.'
  ],
  'e.badImageModel': ['Неизвестная модель изображений: {name}', 'Unknown image model: {name}'],
  'e.imageSize': [
    'Неподдерживаемый размер: {value}. Используйте 1024x1024, 1024x1536, 1536x1024, 1024x1792 или 1792x1024.',
    'Unsupported size: {value}. Use 1024x1024, 1024x1536, 1536x1024, 1024x1792 or 1792x1024.'
  ],
  'e.imageProvider': [
    'Этот провайдер не поддерживает генерацию изображений. Подключите OpenAI-совместимый API или OpenRouter с моделью изображений.',
    'This provider does not support image generation. Connect an OpenAI-compatible API or OpenRouter with an image model.'
  ],
  'e.imageUnavailable': [
    'Генерация изображений недоступна: у провайдера нет модели изображений.',
    'Image generation is unavailable: the provider has no image model.'
  ],
  'e.readOnly': [
    'Запуск только для чтения: запись недоступна.',
    'Read-only run: writing is not available.'
  ],
  'e.imageNoData': ['Провайдер не вернул изображение.', 'The provider returned no image.'],
  'e.imageBadData': [
    'Провайдер вернул данные, которые не являются изображением.',
    'The provider returned data that is not an image.'
  ],
  'e.imageTooBig': ['Изображение больше 20 МБ.', 'The image is larger than 20 MB.'],
  'e.imageDownload': [
    'Не удалось скачать изображение: {reason}',
    'Could not download the image: {reason}'
  ],

  'd.wrote': ['Записано: {path}', 'Wrote: {path}'],
  'd.wroteOutside': ['Записано вне проекта: {path}', 'Wrote outside project: {path}'],
  'd.rejected': ['Отклонено: {path}', 'Rejected: {path}'],
  'd.noChange': ['Без изменений: {path}', 'Unchanged: {path}'],
  'd.read': ['Прочитано: {path}', 'Read: {path}'],
  'd.listed': ['Показано записей: {n}', 'Listed {n} entries'],
  'd.truncated': [' {n} (обрезано)', ' {n} (truncated)'],
  'd.emptyFolder': ['Папка пуста', 'Folder is empty'],
  'd.found': ['Найдено совпадений: {n}', '{n} matches'],
  'd.granted': ['Разрешён доступ к {path}', 'Access granted to {path}'],
  'd.agentDone': ['Агент {name} закончил', 'Agent {name} finished'],
  'd.skillLoaded': ['Скил {name} загружен', 'Skill {name} loaded'],
  'd.listedProjects': ['Проектов: {n}', 'Listed {n} projects'],
  'd.screenshot': ['Снимок экрана {width}x{height}', 'Screen capture {width}x{height}'],
  'd.answered': ['Ответ: {answer}', 'Answer: {answer}'],
  'd.skipped': ['Ответ не пришёл', 'No answer came back'],
  'screen.display': ['Экран', 'Screen'],
  'd.projectAlready': ['Проект уже открыт', 'Project already open'],
  'd.projectSwitch': ['Открывается проект {name}', 'Opening project {name}'],
  'd.planSaved': ['План сохранён', 'Plan saved'],
  'd.imageSaved': ['Изображение сохранено: {path}', 'Image saved: {path}'],
  'd.imageSavedOutside': [
    'Изображение сохранено вне проекта: {path}',
    'Image saved outside the project: {path}'
  ],
  'd.imageRejected': [
    'Сохранение изображения отклонено: {path}',
    'Image save rejected: {path}'
  ],
  'd.compacted': ['Сжато ~{before} → ~{after} токенов', 'Compacted ~{before} → ~{after} tokens'],
  'd.compactFailed': [
    'Сводка не удалась — оставил последние сообщения. {reason}',
    'Summary failed — kept the latest messages. {reason}'
  ],
  'd.error': ['Ошибка: {reason}', 'Error: {reason}'],
  'd.stopped': ['Остановлено вами', 'Stopped by you'],
  'd.interrupted': ['Прервано ошибкой', 'Interrupted by an error'],
  'd.denied': ['Доступ не разрешён', 'Access not granted']
} as const

export type TranslationKey = keyof typeof entries

const RU_FORMS = (n: number): number => {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 0
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 1
  return 2
}

function formOf(lang: Lang, pattern: string, count: number): string {
  const forms = pattern.split('|')
  const index = lang === 'ru' ? RU_FORMS(count) : count === 1 ? 0 : Math.min(1, forms.length - 1)
  return (forms[index] ?? forms[forms.length - 1] ?? '').replace('{n}', String(count))
}

export function translate(
  lang: Lang,
  key: TranslationKey,
  vars?: Record<string, string | number>
): string {
  const pair = entries[key] as readonly [string, string] | undefined
  let text = (lang === 'ru' ? pair?.[0] : pair?.[1]) ?? key
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value))
    }
  }
  return text
}

export function translateCount(
  lang: Lang,
  key: TranslationKey,
  count: number
): string {
  const pair = entries[key] as readonly [string, string] | undefined
  return formOf(lang, (lang === 'ru' ? pair?.[0] : pair?.[1]) ?? '{n}', count)
}

export function createTranslator(lang: Lang) {
  return {
    t: (key: TranslationKey, vars?: Record<string, string | number>) =>
      translate(lang, key, vars),
    tc: (key: TranslationKey, count: number) => translateCount(lang, key, count)
  }
}

export type Translator = ReturnType<typeof createTranslator>

export const LANGUAGES: { id: Lang; label: string }[] = [
  { id: 'ru', label: 'Русский' },
  { id: 'en', label: 'English' }
]

export const MONTHS: Record<Lang, string[]> = {
  ru: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
}

export const WEEKDAYS: Record<Lang, string[]> = {
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
}
