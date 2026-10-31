import {
  clampCompactPercent,
  clampEffort,
  compactMinPercent,
  COMPACT_DEFAULT_PERCENT,
  COMPACT_MAX_PERCENT,
  contextWindowFor,
  defaultEffortFor,
  detectBrand,
  isImageModel,
  normalizeEffort,
  prettyModelName
} from '../../../shared/modelNames'
import {
  FREE_PROVIDER_BASE_URL,
  FREE_PROVIDER_ID,
  FREE_PROVIDER_MODELS,
  freeProviderLabel,
  filterFreeModels,
  isFreeProvider
} from '../../../shared/freeModels'
import type {
  ActivityDay,
  ActivityView,
  AgentEvent,
  AppearancePayload,
  ApprovalAnswer,
  ApprovalPolicy,
  ApprovalRequest,
  ApprovalScope,
  ChatAttachment,
  CloseCodeApi,
  ContextState,
  EffortLevel,
  ExportChatPayload,
  FetchModelsPayload,
  Lang,
  ModelLoad,
  ProjectInfo,
  ProviderView,
  RestoredMessage,
  SaveSettingsPayload,
  SecondOpinionPayload,
  SecondOpinionResult,
  ScreenShotView,
  SendMessagePayload,
  SetActiveModelPayload,
  SettingsView,
  SkillInfo,
  AgentInfo,
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalSessionInfo,
  TreeEntry,
  TreePayload,
  TreeResult,
  UserQuestion
} from '../../../shared/types'
import { tStatic } from '../i18n'

const STORAGE_KEY = 'closecode-preview-settings-v3'
const ACTIVITY_KEY = 'closecode-preview-activity-v1'
const TITLES_KEY = 'closecode-preview-titles-v1'
const ACTIVITY_WINDOW = 366
const DEMO_ROOT = 'C:/Демо-проекты'
const INITIAL_CONTEXT = 2600
const TURN_CONTEXT_COST = 5600
const SENSITIVE_PATHS =
  /(^|\/)(package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|tsconfig[^/]*\.json|electron\.vite\.config\.[^/]+|vite\.config\.[^/]+|\.env[^/]*|\.git\/|\.github\/|Dockerfile|docker-compose[^/]*|src\/main\/|src\/preload\/|scripts\/)/i

const README_BEFORE = `# Demo Shop

Учебный интернет-магазин на React.

## Запуск

npm install
npm run dev
`

const README_AFTER = `# Demo Shop

Учебный интернет-магазин на React и TypeScript.

## Что внутри

- Каталог товаров с фильтрами
- Карточка товара и корзина
- Мок-данные без бэкенда

## Запуск

npm install
npm run dev

## Скрипты

- \`npm run dev\` — локальная разработка
- \`npm run build\` — production-сборка
- \`npm run test\` — юнит-тесты
`

const STRUCTURE_REPLY = `Проект **demo-shop** устроен просто:

- \`src/App.tsx\` — корневой компонент и сборка страницы каталога.
- \`src/components/\` — карточка товара, фильтры и корзина.
- \`src/data/\` — мок-данные товаров.
- \`public/\` — логотип и статические файлы.

Точка входа — \`src/main.tsx\`, стили лежат рядом с компонентами. Если нужно, разберу любой файл подробнее или предложу улучшения.
`

const BUGS_REPLY = `Нашёл несколько мест, на которые стоит посмотреть:

1. **Обработка ошибок** — в \`src/App.tsx\` нет состояния загрузки, поэтому при медленном ответе интерфейс остаётся пустым.
2. **Ключи списков** — карточки рендерятся по индексу массива, при сортировке элементы будут перемонтироваться.
3. **Форматирование цен** — суммы выводятся без учёта локали.

Могу показать, как исправить первый пункт, или подготовить diff по любому из них.
`

const CHAT_REPLY = `Я — **CloseCode**, агент для работы с кодом через ваш собственный API-ключ.

Сейчас открыто браузерное превью: ответы имитируются, интерфейс полностью рабочий.

- Попросите **добавить README** — покажу diff и подтверждение записи.
- Попросите **объяснить структуру** или **найти баги** — увидите инструменты чтения файлов.
- Выберите **мощность модели** рядом с полем ввода: набор уровней зависит от модели.
- После ответа нажмите **«Второе мнение»** — другая модель проверит его на ошибки.
- Откройте настройки, чтобы сменить тему, подтверждения, автосжатие и провайдеров.

В полной версии те же экраны работают с настоящими файлами на диске и реальным API.
`

const DEMO_PROJECTS: ProjectInfo[] = [
  {
    path: `${DEMO_ROOT}/demo-shop`,
    name: 'demo-shop',
    addedAt: 0,
    lastUsedAt: 0,
    messages: 6,
    available: true
  },
  {
    path: `${DEMO_ROOT}/landing-page`,
    name: 'landing-page',
    addedAt: 0,
    lastUsedAt: 0,
    messages: 2,
    available: true
  },
  {
    path: `${DEMO_ROOT}/old-api`,
    name: 'old-api',
    addedAt: 0,
    lastUsedAt: 0,
    messages: 0,
    available: false
  }
]

const DEMO_SKILLS: SkillInfo[] = [
  {
    id: 'global:commit-writer',
    name: 'commit-writer',
    description: 'Пишет сообщения коммитов по диффу',
    source: 'global',
    enabled: true,
    chars: 2400
  },
  {
    id: 'global:code-review',
    name: 'code-review',
    description: 'Аудит безопасности и ошибок перед мержем',
    source: 'global',
    enabled: false,
    chars: 5100
  },
  {
    id: 'project:react-style',
    name: 'react-style',
    description: 'Соглашения по компонентам этого проекта',
    source: 'project',
    enabled: true,
    chars: 1800
  }
]

const DEMO_AGENTS: AgentInfo[] = [
  {
    id: 'global:explorer',
    name: 'explorer',
    description: 'Быстрый поиск по кодовой базе',
    model: null,
    source: 'global'
  },
  {
    id: 'global:reviewer',
    name: 'reviewer',
    description: 'Разбор diff и поиск рисков',
    model: 'gpt-4o',
    source: 'global'
  },
  {
    id: 'project:docs-writer',
    name: 'docs-writer',
    description: 'README и комментарии к модулям',
    model: null,
    source: 'project'
  }
]

const DEMO_HISTORY: Record<string, RestoredMessage[]> = {
  [`${DEMO_ROOT}/demo-shop`]: [
    { id: '0', role: 'user', text: 'Объясни структуру этого проекта', files: [] },
    { id: '1', role: 'assistant', text: STRUCTURE_REPLY, files: [] }
  ]
}

function now(): number {
  return Date.now()
}

function defaultSettings(): SettingsView {
  const [first] = DEMO_PROJECTS
  return {
    providers: [
      {
        id: FREE_PROVIDER_ID,
        label: freeProviderLabel('ru'),
        kind: 'openai',
        baseUrl: FREE_PROVIDER_BASE_URL,
        models: [...FREE_PROVIDER_MODELS],
        hasKey: false,
        free: true
      },
      {
        id: 'demo-openai',
        label: 'OpenAI',
        kind: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        models: ['gpt-4o-mini', 'gpt-4o', 'gpt-image-1'],
        hasKey: true,
        free: false
      },
      {
        id: 'demo-anthropic',
        label: 'Anthropic',
        kind: 'anthropic',
        baseUrl: 'https://api.anthropic.com',
        models: ['claude-sonnet-4-5', 'claude-haiku-4-5'],
        hasKey: true,
        free: false
      }
    ],
    activeProviderId: FREE_PROVIDER_ID,
    activeModel: FREE_PROVIDER_MODELS[0],
    projects: DEMO_PROJECTS.map((project) => ({ ...project, addedAt: now(), lastUsedAt: now() })),
    projectPath: first.path,
    activeProjectPath: first.path,
    allowedRoots: [`${DEMO_ROOT}/shared-ui`],
    language: 'ru',
    effort: 'medium',
    efforts: {},
    theme: 'graphite',
    accent: 'graphite',
    density: 'comfy',
    windowMode: 'app',
    motion: 'full',
    uiScale: 100,
    opinionProviderId: null,
    opinionModel: null,
    approvalPolicy: 'always',
    compactAt: COMPACT_DEFAULT_PERCENT,
    compactMin: compactMinPercent(contextWindowFor('gpt-4o-mini')),
    compactMax: COMPACT_MAX_PERCENT,
    skills: DEMO_SKILLS.map((skill) => ({ ...skill })),
    agents: DEMO_AGENTS.map((agent) => ({ ...agent }))
  }
}

function normalize(view: SettingsView): SettingsView {
  const active =
    view.providers.find(
      (provider) => provider.id === view.activeProviderId && provider.models.length > 0
    ) ?? view.providers.find((provider) => provider.models.length > 0) ?? null
  const activeModel =
    active && view.activeModel && active.models.includes(view.activeModel)
      ? view.activeModel
      : (active?.models[0] ?? null)
  const reviewer = view.providers.find((provider) => provider.id === view.opinionProviderId)
  const reviewerModel = view.opinionModel
  const reviewerValid = Boolean(
    reviewer && reviewerModel && reviewer.models.includes(reviewerModel)
  )
  return {
    ...view,
    activeProviderId: active?.id ?? null,
    activeModel,
    opinionProviderId: reviewerValid ? view.opinionProviderId : null,
    opinionModel: reviewerValid ? view.opinionModel : null
  }
}

function parseEfforts(raw: unknown): Record<string, EffortLevel> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const efforts: Record<string, EffortLevel> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!key.trim()) continue
    efforts[key] = normalizeEffort(value)
  }
  return efforts
}

function loadSettings(): SettingsView {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSettings()
    const parsed = JSON.parse(raw) as Partial<SettingsView>
    if (!Array.isArray(parsed.providers)) return defaultSettings()
    const providers: ProviderView[] = parsed.providers
      .filter(
        (provider) =>
          Boolean(provider) && typeof provider.id === 'string' && Array.isArray(provider.models)
      )
      .map((provider) => ({
        id: provider.id,
        label:
          typeof provider.label === 'string' && provider.label.trim()
            ? provider.label
            : tStatic('s.defaultProvider'),
        kind: provider.kind === 'anthropic' ? 'anthropic' : 'openai',
        baseUrl: typeof provider.baseUrl === 'string' ? provider.baseUrl : '',
        models: provider.models.filter((model): model is string => typeof model === 'string'),
        hasKey: provider.hasKey === true,
        free: provider.free === true || isFreeProvider({ id: provider.id, baseUrl: provider.baseUrl })
      }))
    const base = defaultSettings()
    return normalize({
      ...base,
      providers,
      activeProviderId:
        typeof parsed.activeProviderId === 'string' ? parsed.activeProviderId : base.activeProviderId,
      activeModel: typeof parsed.activeModel === 'string' ? parsed.activeModel : base.activeModel,
      projects: Array.isArray(parsed.projects) && parsed.projects.length ? parsed.projects : base.projects,
      activeProjectPath: parsed.activeProjectPath ?? base.activeProjectPath,
      projectPath: parsed.projectPath ?? base.projectPath,
      allowedRoots: Array.isArray(parsed.allowedRoots) ? parsed.allowedRoots : base.allowedRoots,
      language: parsed.language === 'en' || parsed.language === 'ru' ? parsed.language : base.language,
      effort: normalizeEffort(parsed.effort),
      efforts: parseEfforts(parsed.efforts),
      theme:
        parsed.theme === 'light' || parsed.theme === 'midnight' || parsed.theme === 'graphite'
          ? parsed.theme
          : base.theme,
      accent:
        parsed.accent === 'graphite' ||
        parsed.accent === 'violet' ||
        parsed.accent === 'blue' ||
        parsed.accent === 'rose' ||
        parsed.accent === 'amber' ||
        parsed.accent === 'lime'
          ? parsed.accent
          : base.accent,
      density: parsed.density === 'compact' ? 'compact' : base.density,
      windowMode: parsed.windowMode === 'terminal' ? 'terminal' : base.windowMode,
      motion: parsed.motion === 'calm' ? 'calm' : base.motion,
      uiScale:
        typeof parsed.uiScale === 'number' && Number.isFinite(parsed.uiScale)
          ? Math.min(120, Math.max(90, Math.round(parsed.uiScale)))
          : base.uiScale,
      opinionProviderId:
        typeof parsed.opinionProviderId === 'string' ? parsed.opinionProviderId : base.opinionProviderId,
      opinionModel: typeof parsed.opinionModel === 'string' ? parsed.opinionModel : base.opinionModel,
      approvalPolicy:
        parsed.approvalPolicy === 'smart' || parsed.approvalPolicy === 'never'
          ? parsed.approvalPolicy
          : base.approvalPolicy,
      compactAt:
        typeof parsed.compactAt === 'number' && Number.isFinite(parsed.compactAt)
          ? Math.round(parsed.compactAt)
          : base.compactAt,
      skills: Array.isArray(parsed.skills) && parsed.skills.length ? parsed.skills : base.skills,
      agents: parsed.agents ?? base.agents
    })
  } catch {
    return defaultSettings()
  }
}

function loadTitles(): Record<string, string> {
  try {
    const raw = localStorage.getItem(TITLES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    const titles: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string' && value.trim()) titles[key] = value.trim().slice(0, 80)
    }
    return titles
  } catch {
    return {}
  }
}

let titles = loadTitles()

function persistTitle(target: string | null, value: string): void {
  if (!target) return
  titles = { ...titles, [target]: value }
  try {
    localStorage.setItem(TITLES_KEY, JSON.stringify(titles))
  } catch {
    // Titles are cosmetic; the preview runs without localStorage.
  }
}

function forgetTitle(target: string | null): void {
  if (!target || !(target in titles)) return
  const next = { ...titles }
  delete next[target]
  titles = next
  try {
    localStorage.setItem(TITLES_KEY, JSON.stringify(titles))
  } catch {
    // ignore quota errors
  }
}

let settings = loadSettings()
let demoProjectIndex = 0
let activeRun: Run | null = null
let pendingApproval: {
  run: Run
  id: string
  request: ApprovalRequest
  resolve: (approved: boolean) => void
} | null = null
let pendingQuestion: { run: Run; id: string; resolve: (answer: string) => void } | null = null
let toolSeq = 0
let approvalSeq = 0
let questionSeq = 0
let contextUsed = INITIAL_CONTEXT
let privateSession = false
let history: RestoredMessage[] = DEMO_HISTORY[settings.activeProjectPath ?? ''] ?? []
let title = titles[settings.activeProjectPath ?? ''] ?? ''

interface LoadState {
  inflight: number
  requests: number
  firstTokenMs: number | null
  avgFirstTokenMs: number | null
  tokensPerSecond: number | null
  avgTokensPerSecond: number | null
  startedAt: number
  outputChars: number
}

const loadState: LoadState = {
  inflight: 0,
  requests: 0,
  firstTokenMs: null,
  avgFirstTokenMs: null,
  tokensPerSecond: null,
  avgTokensPerSecond: null,
  startedAt: 0,
  outputChars: 0
}

let loadTicker: number | null = null

function activeLimit(): number {
  return settings.activeModel ? contextWindowFor(settings.activeModel) : 128_000
}

function compactRatio(): number {
  return clampCompactPercent(settings.compactAt, activeLimit()) / 100
}

function currentEffort(): EffortLevel {
  if (!settings.activeModel) return settings.effort
  return clampEffort(
    settings.activeModel,
    settings.efforts[settings.activeModel] ?? defaultEffortFor(settings.activeModel)
  )
}

function modelLoad(): ModelLoad {
  const activeProvider = settings.providers.find(
    (provider) => provider.id === settings.activeProviderId
  )
  return {
    inflight: loadState.inflight,
    requests: loadState.requests,
    activeModel: settings.activeModel,
    activeBrand: detectBrand(settings.activeModel ?? '', activeProvider?.label ?? ''),
    firstTokenMs: loadState.firstTokenMs,
    avgFirstTokenMs: loadState.avgFirstTokenMs,
    tokensPerSecond: loadState.tokensPerSecond,
    avgTokensPerSecond: loadState.avgTokensPerSecond,
    elapsedMs: loadState.inflight ? now() - loadState.startedAt : 0,
    outputChars: loadState.outputChars
  }
}

function beginStream(): void {
  loadState.inflight += 1
  loadState.requests += 1
  loadState.startedAt = now()
  loadState.outputChars = 0
  loadState.firstTokenMs = null
  loadState.tokensPerSecond = null
  if (loadTicker === null) {
    loadTicker = window.setInterval(() => emit({ type: 'load', load: modelLoad() }), 240)
  }
  emit({ type: 'load', load: modelLoad() })
}

function endStream(): void {
  if (loadState.inflight > 0) loadState.inflight -= 1
  const elapsed = now() - loadState.startedAt
  const tokens = Math.round(loadState.outputChars / 4)
  const tps = elapsed > 0 ? (tokens / elapsed) * 1000 : null
  if (tps !== null) {
    loadState.tokensPerSecond = tps
    loadState.avgTokensPerSecond =
      loadState.avgTokensPerSecond === null
        ? tps
        : (loadState.avgTokensPerSecond + tps) / 2
  }
  if (loadState.firstTokenMs !== null) {
    loadState.avgFirstTokenMs =
      loadState.avgFirstTokenMs === null
        ? loadState.firstTokenMs
        : (loadState.avgFirstTokenMs + loadState.firstTokenMs) / 2
  }
  if (loadState.inflight === 0 && loadTicker !== null) {
    window.clearInterval(loadTicker)
    loadTicker = null
  }
  emit({ type: 'load', load: modelLoad() })
}

const listeners = new Set<(event: AgentEvent) => void>()

interface DayCount {
  messages: number
  tools: number
  writes: number
}

function activityKey(date: Date): string {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

function seedActivityDays(): Record<string, DayCount> {
  const days: Record<string, DayCount> = {}
  let state = 19704026
  const rand = (): number => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let offset = ACTIVITY_WINDOW - 1; offset >= 0; offset--) {
    const date = new Date(today)
    date.setDate(date.getDate() - offset)
    const dow = date.getDay()
    const weekend = dow === 0 || dow === 6
    if (rand() < (weekend ? 0.68 : 0.22)) continue
    const messages = 1 + Math.floor(rand() * (weekend ? 2 : 6))
    const tools = messages * (2 + Math.floor(rand() * 7))
    const writes = rand() > 0.45 ? Math.floor(rand() * messages * 1.6) : 0
    days[activityKey(date)] = { messages, tools, writes }
  }
  return days
}

function normalizeActivity(raw: unknown): Record<string, DayCount> | null {
  if (!raw || typeof raw !== 'object') return null
  const days: Record<string, DayCount> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !value || typeof value !== 'object') continue
    const item = value as Record<string, unknown>
    const num = (field: string): number =>
      typeof item[field] === 'number' && item[field] > 0 ? Math.round(item[field] as number) : 0
    days[key] = { messages: num('messages'), tools: num('tools'), writes: num('writes') }
  }
  return Object.keys(days).length ? days : null
}

function loadActivityDays(): Record<string, DayCount> {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY)
    if (raw) {
      const parsed = normalizeActivity(JSON.parse(raw) as unknown)
      if (parsed) return parsed
    }
  } catch {
    // fall through to a fresh seeded map
  }
  const seeded = seedActivityDays()
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(seeded))
  } catch {
    // preview works without localStorage
  }
  return seeded
}

let activityDays = loadActivityDays()

function bumpActivity(field: keyof DayCount): void {
  if (privateSession) return
  const key = activityKey(new Date())
  const day = activityDays[key] ?? { messages: 0, tools: 0, writes: 0 }
  const next: DayCount = { ...day, [field]: day[field] + 1 }
  activityDays = { ...activityDays, [key]: next }
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activityDays))
  } catch {
    // ignore quota errors
  }
}

async function getActivity(): Promise<ActivityView> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days: ActivityDay[] = []
  let totalMessages = 0
  let totalTools = 0
  let totalWrites = 0
  let activeDays = 0
  let busiest = 0

  for (let offset = ACTIVITY_WINDOW - 1; offset >= 0; offset--) {
    const date = new Date(today)
    date.setDate(date.getDate() - offset)
    const key = activityKey(date)
    const stored = activityDays[key] ?? { messages: 0, tools: 0, writes: 0 }
    const score = stored.messages + stored.tools + stored.writes
    totalMessages += stored.messages
    totalTools += stored.tools
    totalWrites += stored.writes
    if (score > 0) activeDays += 1
    if (score > busiest) busiest = score
    days.push({ date: key, ...stored })
  }

  let longestStreak = 0
  let currentStreak = 0
  let run = 0
  for (let index = 0; index < days.length; index++) {
    const score = days[index].messages + days[index].tools + days[index].writes
    if (score > 0) {
      run += 1
      if (run > longestStreak) longestStreak = run
    } else {
      run = 0
    }
  }
  for (let index = days.length - 1; index >= 0; index--) {
    const score = days[index].messages + days[index].tools + days[index].writes
    if (score > 0) currentStreak += 1
    else if (index === days.length - 1) continue
    else break
  }

  return {
    days,
    totalMessages,
    totalTools,
    totalWrites,
    activeDays,
    currentStreak,
    longestStreak,
    busiest
  }
}

interface Run {
  cancelled: boolean
}

function contextState(): ContextState {
  const limit = activeLimit()
  return {
    used: Math.min(contextUsed, limit),
    limit,
    threshold: compactRatio(),
    estimated: true
  }
}

function emit(event: AgentEvent): void {
  for (const listener of [...listeners]) listener(event)
}

function emitContext(): void {
  emit({ type: 'context', context: contextState() })
}

function tokenEstimate(text: string, fileChars = 0): number {
  return Math.ceil((text.length + fileChars) / 3.2)
}

function shortTokens(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(Math.round(value))
}

async function compactDemo(run: Run, source: 'auto' | 'manual'): Promise<boolean> {
  const before = contextUsed
  emit({ type: 'compact-start', source })
  await sleep(1050)
  if (run.cancelled) return false
  contextUsed = INITIAL_CONTEXT + 1800
  emit({
    type: 'compact-end',
    ok: true,
    detail: tStatic('d.compacted', { before: shortTokens(before), after: shortTokens(contextUsed) }),
    context: contextState()
  })
  return true
}

function snapshot(): SettingsView {
  const limit = activeLimit()
  return {
    ...settings,
    providers: settings.providers.map((provider) => ({ ...provider, models: [...provider.models] })),
    projects: settings.projects.map((project) => ({ ...project })),
    skills: settings.skills.map((skill) => ({ ...skill })),
    agents: settings.agents.map((agent) => ({ ...agent })),
    allowedRoots: [...settings.allowedRoots],
    effort: currentEffort(),
    efforts: { ...settings.efforts },
    compactAt: clampCompactPercent(settings.compactAt, limit),
    compactMin: compactMinPercent(limit),
    compactMax: COMPACT_MAX_PERCENT
  }
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Preview still works without localStorage.
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function startTool(
  name: string,
  args: Record<string, unknown>,
  parent?: string | null,
  agent?: string | null
): string {
  const id = `demo-tool-${++toolSeq}`
  emit({ type: 'tool-start', id, name, args, parent, agent })
  return id
}

function endTool(id: string, ok: boolean, detail: string, parent?: string | null): void {
  emit({ type: 'tool-end', id, ok, detail, parent })
}

async function useTool(
  run: Run,
  name: string,
  args: Record<string, unknown>,
  detail: string,
  parent?: string | null,
  agent?: string | null
): Promise<boolean> {
  const id = startTool(name, args, parent, agent)
  await sleep(600)
  if (run.cancelled) {
    endTool(id, false, tStatic('d.stopped'), parent)
    return false
  }
  endTool(id, true, detail, parent)
  bumpActivity('tools')
  if (name === 'write_file') bumpActivity('writes')
  return true
}

async function say(run: Run, text: string): Promise<void> {
  if (loadState.inflight === 0) beginStream()
  const chunks = text.match(/\S+\s*/g) ?? [text]
  for (const chunk of chunks) {
    if (run.cancelled) return
    if (loadState.firstTokenMs === null) {
      loadState.firstTokenMs = now() - loadState.startedAt
    }
    loadState.outputChars += chunk.length
    loadState.tokensPerSecond =
      (loadState.outputChars / 4 / Math.max(1, now() - loadState.startedAt)) * 1000
    emit({ type: 'text-delta', text: chunk })
    await sleep(20 + Math.random() * 32)
  }
  if (!run.cancelled) await sleep(60)
}

function detectIntent(text: string): 'structure' | 'bugs' | 'write' | 'image' | 'ask' | 'chat' {
  const normalized = text.toLowerCase()
  if (/нарису|картин|изображен|иллюстрац|логотип|фото|draw|image|picture|photo|illustration/.test(normalized)) {
    return 'image'
  }
  if (/спрос|вопрос|уточн|ask me|question/.test(normalized)) return 'ask'
  if (/баг|ошибк|bug|проблем|багов/.test(normalized)) return 'bugs'
  if (/структур|объясн|расскажи о проекте|как устроен/.test(normalized)) return 'structure'
  if (/созда|добав|запиш|измени|исправ|readme|рефактор/.test(normalized)) return 'write'
  return 'chat'
}

function detectFilePath(prompt: string): string {
  const match = prompt.match(/[\w./-]+\.(?:tsx?|jsx?|json|md|txt|css|html?)/i)
  if (match) return match[0].replace(/^\.\//, '')
  if (/readme/i.test(prompt)) return 'README.md'
  return 'src/demo.ts'
}

function oldContentFor(filePath: string): string | null {
  return /readme/i.test(filePath) ? README_BEFORE : null
}

function newContentFor(filePath: string, prompt: string): string {
  if (/readme/i.test(filePath)) return README_AFTER
  if (/\.(tsx?|jsx?)$/i.test(filePath)) {
    return `export function greet(name: string): string {\n  return \`Привет, \${name}! Этот файл создан в демо-режиме CloseCode.\`\n}\n`
  }
  if (/\.json$/i.test(filePath)) return `{\n  "name": "demo",\n  "private": true\n}\n`
  if (/\.css$/i.test(filePath)) return `.demo-card {\n  border-radius: 14px;\n  padding: 16px;\n}\n`
  if (/\.html?$/i.test(filePath)) {
    return `<!doctype html>\n<html lang="ru">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Demo</title>\n  </head>\n  <body>\n    <h1>Привет из CloseCode</h1>\n  </body>\n</html>\n`
  }
  if (/привет/i.test(prompt)) return 'Привет! Этот файл создан в демо-режиме CloseCode.\n'
  return `# ${filePath}\n\nФайл создан агентом CloseCode в демо-режиме.\n`
}

function requestApproval(run: Run, request: ApprovalRequest): Promise<boolean> {
  return new Promise((resolve) => {
    pendingApproval = { run, id: request.id, request, resolve }
    emit({ type: 'approval-request', request })
  })
}

/** Line-level added/removed counts, same approach as the real tools. */
function diffStats(oldContent: string | null, newContent: string): { added: number; removed: number } {
  const before = oldContent ? oldContent.split(/\r?\n/) : []
  const after = newContent.split(/\r?\n/)
  let prefix = 0
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) {
    prefix++
  }
  let suffix = 0
  while (
    suffix < before.length - prefix &&
    suffix < after.length - prefix &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) {
    suffix++
  }
  return {
    added: Math.max(0, after.length - prefix - suffix),
    removed: Math.max(0, before.length - prefix - suffix)
  }
}

function isImportantChange(request: ApprovalRequest): boolean {
  if (request.scope !== 'write') return true
  if (request.oldContent === null) return true
  const path = request.path.replace(/\\/g, '/')
  if (SENSITIVE_PATHS.test(path)) return true
  const stats = diffStats(request.oldContent, request.newContent ?? '')
  return stats.added + stats.removed > 60
}

/** Mirrors the main-process policy: outside-folder access is never silent. */
function autoApprovalFor(request: ApprovalRequest): ApprovalAnswer | null {
  const policy = settings.approvalPolicy
  if (policy === 'always') return null
  if (request.scope !== 'write' && request.scope !== 'image') return null
  if (policy === 'never') return 'once'
  return request.scope === 'write' && isImportantChange(request) ? null : 'once'
}

async function approveRequest(run: Run, request: ApprovalRequest): Promise<boolean> {
  const automatic = autoApprovalFor(request)
  if (automatic) {
    emit({ type: 'approval-auto', path: request.path, scope: request.scope })
    return automatic !== 'deny'
  }
  return requestApproval(run, request)
}

function demoTitleFor(text: string): string {
  const ru = settings.language === 'ru'
  const intent = detectIntent(text)
  if (intent === 'image') return ru ? 'Сгенерировать изображение' : 'Generate an image'
  if (intent === 'structure') return ru ? 'Разобрать структуру проекта' : 'Review project structure'
  if (intent === 'bugs') return ru ? 'Найти баги в проекте' : 'Find bugs in the project'
  if (intent === 'write') {
    const file = detectFilePath(text)
    return /readme/i.test(file)
      ? ru
        ? 'Обновить README проекта'
        : 'Update the project README'
      : ru
        ? `Изменить ${file}`
        : `Change ${file}`
  }
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).slice(0, 6).join(' ')
  if (!words) return ru ? 'Новая задача' : 'New task'
  const pretty = words.charAt(0).toUpperCase() + words.slice(1)
  return pretty.length > 56 ? `${pretty.slice(0, 56).trimEnd()}…` : pretty
}

/** Names the session after the first request, like the main process does. */
function scheduleTitle(run: Run, text: string): void {
  const source = text.trim()
  if (!source || title) return
  void (async () => {
    await sleep(700)
    if (run.cancelled || activeRun !== run || title) return
    const next = demoTitleFor(source)
    title = next
    if (!privateSession) persistTitle(settings.activeProjectPath, next)
    emit({ type: 'title', title: next })
  })()
}

async function simulateWrite(run: Run, prompt: string): Promise<void> {
  const filePath = detectFilePath(prompt)
  const outside = /^\.\.[\\/]|~/.test(filePath)
  const oldContent = outside ? null : oldContentFor(filePath)
  const scope: ApprovalScope = outside ? 'write-outside' : 'write'
  const absolutePath = `${settings.projectPath ?? DEMO_ROOT}/${filePath.replace(/^(\.\.[\\/])+/, '')}`

  emit({ type: 'assistant-start' })
  await say(run, `Подготовлю изменения в \`${filePath}\`. Сначала проверю файлы проекта.\n\n`)
  if (!(await useTool(run, 'list_files', { path: '.' }, tStatic('d.found', { n: 8 })))) return
  if (oldContent !== null) {
    if (!(await useTool(run, 'read_file', { path: filePath }, tStatic('d.read', { path: filePath })))) return
  }
  if (run.cancelled) return

  const newContent = newContentFor(filePath, prompt)
  const writeId = startTool('write_file', { path: filePath, content: newContent })
  await sleep(350)
  if (run.cancelled) {
    endTool(writeId, false, tStatic('d.stopped'))
    return
  }

  const request: ApprovalRequest = {
    id: `demo-approval-${++approvalSeq}`,
    scope,
    path: filePath,
    absolutePath,
    oldContent,
    newContent
  }
  const approved = await approveRequest(run, request)
  if (run.cancelled) {
    endTool(writeId, false, tStatic('d.stopped'))
    return
  }

  if (!approved) {
    endTool(writeId, false, tStatic('d.rejected', { path: filePath }))
    emit({ type: 'assistant-start' })
    await say(run, 'Понял, ничего не менял. Если хотите, предложу другой вариант правки.')
    return
  }

  endTool(writeId, true, tStatic('d.wrote', { path: filePath }))
  const stats = diffStats(oldContent, newContent)
  emit({ type: 'edit', id: writeId, path: filePath, added: stats.added, removed: stats.removed, kind: 'write' })
  bumpActivity('tools')
  bumpActivity('writes')
  emit({ type: 'assistant-start' })
  await say(
    run,
    `Готово — изменения в \`${filePath}\` применены.\n\nЕсли нужно что-то поправить, скажите — покажу новый diff.`
  )
}

async function simulateRead(run: Run, intent: 'structure' | 'bugs'): Promise<void> {
  emit({ type: 'assistant-start' })
  await say(
    run,
    intent === 'structure'
      ? 'Сначала посмотрю, что лежит в проекте.\n\n'
      : 'Изучу файлы проекта и поищу слабые места.\n\n'
  )
  if (!(await useTool(run, 'list_files', { path: '.' }, tStatic('d.found', { n: 8 })))) return

  const parentId = startTool('run_subagent', { agent: 'explorer', task: 'карта файлов' }, null, 'explorer')
  await sleep(400)
  await useTool(
    run,
    'read_file',
    { path: 'src/App.tsx' },
    tStatic('d.read', { path: 'src/App.tsx' }),
    parentId,
    'explorer'
  )
  await useTool(
    run,
    'search_files',
    { pattern: 'useState' },
    tStatic('d.found', { n: 5 }),
    parentId,
    'explorer'
  )
  endTool(parentId, true, tStatic('d.agentDone', { name: 'explorer' }))
  if (run.cancelled) return

  emit({ type: 'assistant-start' })
  await say(run, intent === 'structure' ? STRUCTURE_REPLY : BUGS_REPLY)
}

let demoPicture: { dataUrl: string; bytes: number } | null = null

/** Paints a soft landscape so the demo shows a real raster preview instead of a stub. */
function demoImage(): { dataUrl: string; bytes: number } {
  if (demoPicture) return demoPicture
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#e9c49b"/></svg>`
    demoPicture = {
      dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      bytes: svg.length
    }
    return demoPicture
  }

  const sky = ctx.createLinearGradient(0, 0, 0, 1024)
  sky.addColorStop(0, '#f7ecda')
  sky.addColorStop(0.5, '#eac69d')
  sky.addColorStop(1, '#8fa98f')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 1024, 1024)

  ctx.fillStyle = 'rgba(255, 249, 236, 0.9)'
  ctx.beginPath()
  ctx.arc(742, 296, 126, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(255, 245, 225, 0.2)'
  ctx.beginPath()
  ctx.arc(742, 296, 212, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#4a6e5c'
  ctx.beginPath()
  ctx.moveTo(-40, 828)
  ctx.quadraticCurveTo(240, 566, 548, 796)
  ctx.quadraticCurveTo(770, 652, 1080, 842)
  ctx.lineTo(1080, 1064)
  ctx.lineTo(-40, 1064)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#31503f'
  ctx.beginPath()
  ctx.moveTo(-40, 942)
  ctx.quadraticCurveTo(280, 762, 622, 932)
  ctx.quadraticCurveTo(846, 820, 1080, 962)
  ctx.lineTo(1080, 1064)
  ctx.lineTo(-40, 1064)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#243a2e'
  ctx.fillRect(726, 742, 128, 92)
  ctx.beginPath()
  ctx.moveTo(700, 748)
  ctx.lineTo(790, 674)
  ctx.lineTo(880, 748)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 226, 168, 0.92)'
  ctx.fillRect(766, 782, 28, 30)

  ctx.fillStyle = 'rgba(22, 28, 23, 0.74)'
  ctx.font = '600 56px "Segoe UI", system-ui, sans-serif'
  ctx.fillText('demo-shop', 64, 898)
  ctx.fillStyle = 'rgba(22, 28, 23, 0.52)'
  ctx.font = '400 29px "Segoe UI", system-ui, sans-serif'
  ctx.fillText('сгенерировано в превью CloseCode', 64, 944)

  const dataUrl = canvas.toDataURL('image/png')
  const bytes = Math.round((dataUrl.length - 'data:image/png;base64,'.length) * 0.75)
  demoPicture = { dataUrl, bytes }
  return demoPicture
}

async function simulateImage(run: Run, prompt: string): Promise<void> {
  emit({ type: 'assistant-start' })
  await say(run, `Сгенерирую изображение: «${prompt.replace(/\s+/g, ' ').slice(0, 120)}».\n\n`)

  const filePath = 'images/demo-picture.png'
  const absolutePath = `${settings.projectPath ?? DEMO_ROOT}/${filePath}`
  const imageId = startTool('generate_image', { prompt, path: filePath })
  await sleep(950)
  if (run.cancelled) {
    endTool(imageId, false, tStatic('d.stopped'))
    return
  }

  const picture = demoImage()
  const request: ApprovalRequest = {
    id: `demo-approval-${++approvalSeq}`,
    scope: 'image',
    path: filePath,
    absolutePath,
    oldContent: null,
    newContent: null,
    image: { dataUrl: picture.dataUrl, mime: 'image/png', bytes: picture.bytes }
  }
  const approved = await approveRequest(run, request)
  if (run.cancelled) {
    endTool(imageId, false, tStatic('d.stopped'))
    return
  }

  if (!approved) {
    endTool(imageId, false, tStatic('d.imageRejected', { path: filePath }))
    emit({ type: 'assistant-start' })
    await say(run, 'Хорошо, не сохраняю. Опишите, что изменить в картинке, и я сгенерирую новый вариант.')
    return
  }

  endTool(imageId, true, tStatic('d.imageSaved', { path: filePath }))
  bumpActivity('tools')
  bumpActivity('writes')
  emit({
    type: 'image',
    id: imageId,
    path: filePath,
    absolutePath,
    mime: 'image/png',
    bytes: picture.bytes
  })
  emit({ type: 'edit', id: imageId, path: filePath, added: 1, removed: 0, kind: 'image' })
  emit({ type: 'assistant-start' })
  await say(
    run,
    `Готово — изображение сохранено в \`${filePath}\`.

В полной версии его рисует image-модель, подключённая к вашему API, а запись на диск происходит только после такого же подтверждения.`
  )
}

async function simulateAttachments(run: Run, files: ChatAttachment[]): Promise<void> {
  emit({ type: 'assistant-start' })
  await say(run, 'Принял вложения — смотрю содержимое.\n\n')

  for (const file of files) {
    if (!(await useTool(run, 'read_file', { path: file.name }, tStatic('d.read', { path: file.name }))))
      return
  }
  if (run.cancelled) return

  const names = files.map((file) => `**${file.name}**`).join(', ')
  emit({ type: 'assistant-start' })
  await say(
    run,
    `Вижу ${names}. В превью показаны только шаги чтения, а в полной версии содержимое файлов уходит в контекст модели вместе с вашим вопросом.

Спросите, что с ними сделать, — например, «объясни этот файл» или «предложи рефактор». Лимит вложений: 5 файлов, до 200 КБ каждый.`
  )
}

/** Stands in for the main-process pause: the demo run waits until the card answers. */
function askAbout(run: Run, question: UserQuestion): Promise<string> {
  return new Promise<string>((resolve) => {
    pendingQuestion = { run, id: question.id, resolve }
    emit({ type: 'question', question })
  })
}

async function simulateAsk(run: Run): Promise<void> {
  emit({ type: 'assistant-start' })
  await say(run, 'Прежде чем трогать код, уточню одну деталь у вас.\n\n')

  const question: UserQuestion = {
    id: `demo-question-${++questionSeq}`,
    question: 'Куда положить новый компонент: в уже знакомую папку или завести новую?',
    options: ['src/components', 'src/ui — новая папка', 'Решай сам'],
    hint: 'Прогон ждёт ответ и продолжится сам.'
  }
  const askId = startTool('ask_user', { question: question.question, options: question.options })
  await sleep(320)
  if (run.cancelled) {
    endTool(askId, false, tStatic('d.stopped'))
    return
  }

  const answer = await askAbout(run, question)
  if (run.cancelled) {
    endTool(askId, false, tStatic('d.stopped'))
    return
  }
  endTool(askId, true, answer ? tStatic('d.answered', { answer }) : tStatic('d.skipped'))

  emit({ type: 'assistant-start' })
  await say(
    run,
    answer
      ? `Принято — делаю как вы сказали: «${answer}». Дальше покажу diff на согласование.`
      : 'Ответ не пришёл, поэтому беру самый осторожный вариант и ничего не переношу без надобности.'
  )
}

async function simulate(run: Run, payload: SendMessagePayload): Promise<void> {
  try {
    if (payload.attachments?.length) {
      await simulateAttachments(run, payload.attachments)
    } else {
      const intent = detectIntent(payload.text)
      if (intent === 'image') {
        await simulateImage(run, payload.text)
      } else if (intent === 'write') {
        await simulateWrite(run, payload.text)
      } else if (intent === 'structure' || intent === 'bugs') {
        await simulateRead(run, intent)
      } else if (intent === 'ask') {
        await simulateAsk(run)
      } else {
        emit({ type: 'assistant-start' })
        await say(run, CHAT_REPLY)
      }
    }
    if (!run.cancelled) emit({ type: 'done' })
  } catch (error) {
    if (!run.cancelled) {
      emit({ type: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  } finally {
    while (loadState.inflight > 0) endStream()
    if (activeRun === run) activeRun = null
  }
}

async function getSettings(): Promise<SettingsView> {
  return snapshot()
}

async function getContext(): Promise<ContextState> {
  return contextState()
}

async function getHistory(): Promise<RestoredMessage[]> {
  return history.map((message) => ({ ...message, files: [...message.files] }))
}

async function getModelLoad(): Promise<ModelLoad> {
  return modelLoad()
}

async function compactContext(): Promise<ContextState> {
  if (activeRun) throw new Error(tStatic('e.waitAction'))
  const run: Run = { cancelled: false }
  activeRun = run
  try {
    await compactDemo(run, 'manual')
    emitContext()
    return contextState()
  } finally {
    if (activeRun === run) activeRun = null
  }
}

async function saveSettings(payload: SaveSettingsPayload): Promise<SettingsView> {
  const providers: ProviderView[] = payload.providers.map((draft) => {
    const baseUrl = draft.baseUrl.trim()
    if (!baseUrl) throw new Error(tStatic('e.badBaseUrl'))
    const existing = settings.providers.find((provider) => provider.id === draft.id)
    const hasKey = draft.apiKey?.trim()
      ? true
      : draft.clearKey
        ? false
        : Boolean(existing?.hasKey)
    return {
      id: draft.id,
      label: draft.label.trim() || tStatic('s.defaultProvider'),
      kind: draft.kind,
      baseUrl,
      models: Array.from(new Set(draft.models.map((model) => model.trim()).filter(Boolean))),
      hasKey,
      free: isFreeProvider({ id: draft.id, baseUrl }) || Boolean(existing?.free)
    }
  })
  settings = normalize({
    ...settings,
    providers,
    activeProviderId: payload.activeProviderId,
    activeModel: payload.activeModel
  })
  persist()
  emitContext()
  return snapshot()
}

async function setActiveModel(payload: SetActiveModelPayload): Promise<SettingsView> {
  const provider = settings.providers.find((item) => item.id === payload.providerId)
  if (!provider || !provider.models.includes(payload.model)) {
    throw new Error(tStatic('e.modelNotListed'))
  }
  settings = { ...settings, activeProviderId: provider.id, activeModel: payload.model }
  persist()
  emitContext()
  emit({ type: 'load', load: modelLoad() })
  return snapshot()
}

async function fetchModels(payload: FetchModelsPayload): Promise<string[]> {
  const baseUrl = payload.baseUrl.trim()
  if (!/^https?:\/\//i.test(baseUrl)) {
    throw new Error(tStatic('s.noBaseUrlForFetch'))
  }
  const existing = payload.providerId
    ? settings.providers.find((provider) => provider.id === payload.providerId)
    : undefined
  const hasKey = Boolean(payload.apiKey?.trim()) || (Boolean(existing?.hasKey) && !payload.clearKey)
  const local = /localhost|127\.0\.0\.1/i.test(baseUrl)
  const free = isFreeProvider({ id: payload.providerId ?? '', baseUrl })
  if (!local && !free && !hasKey) throw new Error(tStatic('c.needsKey'))
  await sleep(750)
  if (free) {
    return filterFreeModels([...FREE_PROVIDER_MODELS, 'anthropic/claude-sonnet-4.5', 'openai/gpt-5-mini'])
  }
  if (local) return ['llama3.2', 'qwen2.5-coder:7b', 'mistral:7b']
  if (payload.kind === 'anthropic') return ['claude-sonnet-4-5', 'claude-opus-4-1', 'claude-haiku-4-5']
  return ['gpt-4o-mini', 'gpt-4o', 'o3-mini', 'gpt-image-1']
}

async function setLanguage(language: Lang): Promise<SettingsView> {
  const lang: Lang = language === 'en' ? 'en' : 'ru'
  const providers = settings.providers.map((provider) =>
    provider.id === FREE_PROVIDER_ID &&
    [freeProviderLabel('ru'), freeProviderLabel('en')].includes(provider.label.trim())
      ? { ...provider, label: freeProviderLabel(lang) }
      : provider
  )
  settings = { ...settings, language: lang, providers }
  persist()
  return snapshot()
}

async function setEffort(effort: EffortLevel): Promise<SettingsView> {
  const value = normalizeEffort(effort)
  settings = {
    ...settings,
    effort: value,
    efforts: settings.activeModel
      ? { ...settings.efforts, [settings.activeModel]: clampEffort(settings.activeModel, value) }
      : { ...settings.efforts }
  }
  persist()
  return snapshot()
}

async function setAppearance(payload: AppearancePayload): Promise<SettingsView> {
  settings = {
    ...settings,
    theme:
      payload.theme === 'light' || payload.theme === 'midnight' || payload.theme === 'graphite'
        ? payload.theme
        : settings.theme,
    accent:
      payload.accent === 'graphite' ||
      payload.accent === 'violet' ||
      payload.accent === 'blue' ||
      payload.accent === 'rose' ||
      payload.accent === 'amber' ||
      payload.accent === 'lime'
        ? payload.accent
        : settings.accent,
    density: payload.density === 'compact' ? 'compact' : 'comfy',
    windowMode: payload.windowMode === 'terminal' ? 'terminal' : 'app',
    motion: payload.motion === 'calm' ? 'calm' : 'full',
    uiScale: Math.min(120, Math.max(90, Math.round(Number(payload.uiScale) || 100)))
  }
  persist()
  return snapshot()
}

async function setSecondOpinion(payload: SecondOpinionPayload): Promise<SettingsView> {
  const provider = settings.providers.find((item) => item.id === payload?.providerId)
  const model = payload?.model
  const usable = Boolean(provider && model && provider.models.includes(model) && !isImageModel(model))
  settings = {
    ...settings,
    opinionProviderId: usable && provider ? provider.id : null,
    opinionModel: usable && model ? model : null
  }
  persist()
  return snapshot()
}

async function setApprovalPolicy(policy: ApprovalPolicy): Promise<SettingsView> {
  settings = {
    ...settings,
    approvalPolicy:
      policy === 'smart' || policy === 'never' || policy === 'always'
        ? policy
        : settings.approvalPolicy
  }
  persist()
  return snapshot()
}

async function setCompactAt(percent: number): Promise<SettingsView> {
  settings = {
    ...settings,
    compactAt: clampCompactPercent(Number(percent), activeLimit())
  }
  persist()
  emitContext()
  return snapshot()
}

async function addProject(): Promise<SettingsView | null> {
  demoProjectIndex = (demoProjectIndex + 1) % DEMO_PROJECTS.length
  return activateProject(DEMO_PROJECTS[demoProjectIndex].path)
}

/** Switches the active project and swaps in the transcript stored for it. */
async function activateProject(path: string): Promise<SettingsView> {
  const project =
    settings.projects.find((item) => item.path === path) ??
    ({
      path,
      name: path.split(/[\\/]/).pop() ?? path,
      addedAt: now(),
      lastUsedAt: now(),
      messages: 0,
      available: true
    }) satisfies ProjectInfo
  settings = {
    ...settings,
    projectPath: path,
    activeProjectPath: path,
    projects: [
      project,
      ...settings.projects.filter((item) => item.path !== path)
    ].map((item) => (item.path === path ? { ...item, lastUsedAt: now() } : item))
  }
  history = privateSession ? [] : (DEMO_HISTORY[path] ?? [])
  title = privateSession ? '' : (titles[path] ?? '')
  contextUsed = INITIAL_CONTEXT + history.reduce((sum, message) => sum + tokenEstimate(message.text), 0)
  persist()
  emitContext()
  return snapshot()
}

async function openProject(path: string): Promise<SettingsView> {
  return activateProject(path)
}

async function removeProject(path: string): Promise<SettingsView> {
  const projects = settings.projects.filter((item) => item.path !== path)
  const nextActive = path === settings.activeProjectPath ? (projects[0]?.path ?? null) : settings.activeProjectPath
  settings = { ...settings, projects, activeProjectPath: nextActive, projectPath: nextActive }
  history = nextActive && !privateSession ? (DEMO_HISTORY[nextActive] ?? []) : []
  title = nextActive && !privateSession ? (titles[nextActive] ?? '') : ''
  persist()
  emitContext()
  return snapshot()
}

async function revokeAllowedRoot(path: string): Promise<SettingsView> {
  settings = { ...settings, allowedRoots: settings.allowedRoots.filter((root) => root !== path) }
  persist()
  return snapshot()
}

async function listSkills(): Promise<SettingsView> {
  return snapshot()
}

async function setSkillEnabled(id: string, enabled: boolean): Promise<SettingsView> {
  settings = {
    ...settings,
    skills: settings.skills.map((skill) => (skill.id === id ? { ...skill, enabled } : skill))
  }
  persist()
  return snapshot()
}

async function revealFolder(target: string): Promise<void> {
  console.info(`[preview] open folder: ${target}`)
}

async function revealPath(): Promise<void> {
  console.info('[preview] reveal path is available only in the desktop app')
}

const DEMO_TREE: Record<string, TreeEntry[]> = {
  '': [
    { name: 'src', path: 'src', dir: true },
    { name: 'scripts', path: 'scripts', dir: true },
    { name: 'package.json', path: 'package.json', dir: false },
    { name: 'README.md', path: 'README.md', dir: false },
    { name: 'tsconfig.json', path: 'tsconfig.json', dir: false }
  ],
  src: [
    { name: 'main', path: 'src/main', dir: true },
    { name: 'renderer', path: 'src/renderer', dir: true },
    { name: 'shared', path: 'src/shared', dir: true }
  ],
  'src/main': [
    { name: 'agent', path: 'src/main/agent', dir: true },
    { name: 'llm', path: 'src/main/llm', dir: true },
    { name: 'index.ts', path: 'src/main/index.ts', dir: false },
    { name: 'settings.ts', path: 'src/main/settings.ts', dir: false }
  ],
  'src/main/agent': [
    { name: 'loop.ts', path: 'src/main/agent/loop.ts', dir: false },
    { name: 'tools.ts', path: 'src/main/agent/tools.ts', dir: false },
    { name: 'context.ts', path: 'src/main/agent/context.ts', dir: false }
  ],
  'src/main/llm': [
    { name: 'openai.ts', path: 'src/main/llm/openai.ts', dir: false },
    { name: 'anthropic.ts', path: 'src/main/llm/anthropic.ts', dir: false },
    { name: 'sse.ts', path: 'src/main/llm/sse.ts', dir: false }
  ],
  'src/renderer': [
    { name: 'src', path: 'src/renderer/src', dir: true },
    { name: 'index.html', path: 'src/renderer/index.html', dir: false }
  ],
  'src/renderer/src': [
    { name: 'components', path: 'src/renderer/src/components', dir: true },
    { name: 'App.tsx', path: 'src/renderer/src/App.tsx', dir: false },
    { name: 'styles.css', path: 'src/renderer/src/styles.css', dir: false }
  ],
  'src/renderer/src/components': [
    { name: 'Composer.tsx', path: 'src/renderer/src/components/Composer.tsx', dir: false },
    { name: 'ProjectTree.tsx', path: 'src/renderer/src/components/ProjectTree.tsx', dir: false },
    { name: 'Sidebar.tsx', path: 'src/renderer/src/components/Sidebar.tsx', dir: false }
  ],
  'src/shared': [
    { name: 'types.ts', path: 'src/shared/types.ts', dir: false },
    { name: 'i18n.ts', path: 'src/shared/i18n.ts', dir: false }
  ],
  scripts: [
    { name: 'agent-smoke.ts', path: 'scripts/agent-smoke.ts', dir: false },
    { name: 'build-installer.mjs', path: 'scripts/build-installer.mjs', dir: false }
  ]
}

/** The browser preview has no desktop to grab, so it paints a stand-in screen. */
function mockScreenDataUrl(): string {
  const canvas = document.createElement('canvas')
  canvas.width = 1280
  canvas.height = 800
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.fillStyle = '#1b1c1e'
  ctx.fillRect(0, 0, 1280, 800)
  ctx.fillStyle = '#2a2c30'
  ctx.fillRect(0, 0, 1280, 48)
  ctx.fillStyle = '#8b9096'
  ctx.font = '20px monospace'
  ctx.fillText('CloseCode preview - mock screen capture', 24, 32)
  ctx.fillStyle = '#3b6ea5'
  ctx.fillRect(48, 96, 520, 260)
  ctx.fillStyle = '#4a4d52'
  ctx.fillRect(620, 96, 600, 620)
  ctx.fillStyle = '#c9cbd1'
  ctx.font = '24px monospace'
  ctx.fillText('screenshots come from the desktop app', 72, 700)
  return canvas.toDataURL('image/png')
}

async function captureScreen(): Promise<ScreenShotView> {
  await sleep(240)
  const dataUrl = mockScreenDataUrl()
  if (!dataUrl) throw new Error(tStatic('e.noScreen'))
  return {
    name: `screen-${Date.now().toString(36)}.png`,
    label: tStatic('screen.display') + ' 1',
    mime: 'image/png',
    bytes: Math.round((dataUrl.length - 22) * 0.75),
    dataUrl,
    width: 1280,
    height: 800,
    displays: 1
  }
}

async function readTree(payload: TreePayload): Promise<TreeResult> {
  await sleep(160)
  const dir = (payload?.path ?? '').replace(/^\.\/?/, '').replace(/\/+$/, '')
  return { path: dir, entries: DEMO_TREE[dir] ?? [], truncated: false }
}

async function readImage(): Promise<string> {
  return demoImage().dataUrl
}

async function sendMessage(payload: SendMessagePayload): Promise<void> {
  if (activeRun) throw new Error(tStatic('e.running'))
  const text = typeof payload.text === 'string' ? payload.text.trim() : ''
  const files = payload.attachments ?? []
  if (!text && !files.length) throw new Error(tStatic('e.emptyMessage'))
  const run: Run = { cancelled: false }
  activeRun = run
  const firstTurn = history.length === 0

  const fileChars = files.reduce(
    (sum, file) => sum + (file.kind === 'image' ? 0 : file.content.length),
    0
  )
  const imageTokens = files.filter((file) => file.kind === 'image').length * 1200
  const incoming = tokenEstimate(payload.text, fileChars) + imageTokens + TURN_CONTEXT_COST
  const limit = activeLimit()

  if (contextUsed + incoming >= limit * compactRatio()) {
    const compacted = await compactDemo(run, 'auto')
    if (!compacted || run.cancelled) {
      if (activeRun === run) activeRun = null
      return
    }
  }

  contextUsed = Math.min(limit, contextUsed + incoming)
  bumpActivity('messages')
  emitContext()
  const images = files
    .filter((file) => file.kind === 'image')
    .map((file) => ({
      name: file.name,
      mime: file.mime ?? 'image/jpeg',
      dataUrl: file.content
    }))
  history = [
    ...history,
    {
      id: String(history.length),
      role: 'user',
      text: payload.text,
      files: files
        .filter((file) => file.kind !== 'image')
        .map((file) => ({ name: file.name, size: file.size })),
      images: images.length ? images : undefined
    }
  ]
  if (firstTurn) scheduleTitle(run, text || files.map((file) => file.name).join(', '))
  void simulate(run, payload)
}

async function cancel(): Promise<void> {
  const run = activeRun
  if (!run) return
  run.cancelled = true
  if (pendingApproval && pendingApproval.run === run) {
    const { id, resolve } = pendingApproval
    pendingApproval = null
    resolve(false)
    emit({ type: 'approval-resolved', id, approved: false })
  }
  if (pendingQuestion && pendingQuestion.run === run) {
    const { id, resolve } = pendingQuestion
    pendingQuestion = null
    resolve('')
    emit({ type: 'question-resolved', id, answer: '' })
  }
  emit({ type: 'done', cancelled: true })
  activeRun = null
}

async function resetChat(): Promise<void> {
  if (activeRun) throw new Error(tStatic('e.stopFirst'))
  contextUsed = INITIAL_CONTEXT
  history = []
  title = ''
  forgetTitle(settings.activeProjectPath)
  emitContext()
}

async function respondApproval(id: string, answer: ApprovalAnswer): Promise<void> {
  if (!pendingApproval || pendingApproval.id !== id) return
  const { resolve, request } = pendingApproval
  pendingApproval = null
  const approved = answer !== 'deny'
  if (answer === 'always') {
    const parent = request.absolutePath.replace(/[\\/][^\\/]*$/, '')
    settings = {
      ...settings,
      allowedRoots: Array.from(new Set([...settings.allowedRoots, parent]))
    }
    persist()
  }
  resolve(approved)
  emit({ type: 'approval-resolved', id, approved })
}

async function answerQuestion(id: string, answer: string): Promise<void> {
  if (!pendingQuestion || pendingQuestion.id !== id) return
  const { resolve } = pendingQuestion
  pendingQuestion = null
  const text = (answer ?? '').trim()
  resolve(text)
  emit({ type: 'question-resolved', id, answer: text })
}

async function getTaskTitle(): Promise<string> {
  return title
}

async function setPrivateSession(enabled: boolean): Promise<boolean> {
  if (activeRun) throw new Error(tStatic('e.stopFirst'))
  privateSession = enabled === true
  history = privateSession ? [] : (DEMO_HISTORY[settings.activeProjectPath ?? ''] ?? [])
  title = privateSession ? '' : (titles[settings.activeProjectPath ?? ''] ?? '')
  contextUsed = INITIAL_CONTEXT + history.reduce((sum, message) => sum + tokenEstimate(message.text), 0)
  emitContext()
  return privateSession
}

async function exportChat(payload: ExportChatPayload): Promise<string | null> {
  try {
    const blob = new Blob([payload.markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = payload.defaultName
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 2000)
    return payload.defaultName
  } catch {
    return null
  }
}

async function secondOpinion(): Promise<SecondOpinionResult> {
  if (activeRun) throw new Error(tStatic('e.running'))
  const user = [...history].reverse().find((message) => message.role === 'user')
  if (!user) throw new Error(tStatic('e.noOpinion'))
  const all = settings.providers
    .flatMap((provider) =>
      provider.models.filter((model) => !isImageModel(model)).map((model) => ({ provider, model }))
    )
  const chosen =
    (settings.opinionProviderId
      ? all.find(
          (item) =>
            item.provider.id === settings.opinionProviderId && item.model === settings.opinionModel
        )
      : null) ?? all.find((item) => item.model !== settings.activeModel) ?? null
  if (!chosen) throw new Error(tStatic('e.noSecondModel'))
  await sleep(1100)
  const ru = settings.language === 'ru'
  const result = ru
    ? `**Проверил ответ независимо.**

- Ответ закрывает исходный запрос и не теряет контекст проекта.
- Стоит проверить крайние случаи: пустые состояния, ошибки сети и повторный запуск.
- Если правки затрагивают существующие файлы, полезно приложить diff до записи.

Блокирующих ошибок не нашёл — ответ можно использовать.`
    : `**Reviewed the answer independently.**

- It addresses the original request without losing the project context.
- Worth checking edge cases: empty states, network errors and repeated runs.
- If edits touch existing files, attach the diff before writing.

No blocking issues found — the answer is safe to use.`
  return {
    text: result,
    model: prettyModelName(chosen.model),
    providerLabel: chosen.provider.label
  }
}

interface PreviewShell {
  id: string
  cwd: string
  line: string
}

const previewShells = new Map<string, PreviewShell>()
const terminalDataListeners = new Set<(event: TerminalDataEvent) => void>()
const terminalExitListeners = new Set<(event: TerminalExitEvent) => void>()
let previewShellSeq = 0

function emitTerminal(id: string, data: string): void {
  for (const listener of terminalDataListeners) listener({ id, data })
}

function demoPrompt(cwd: string): string {
  return `\x1b[38;5;114mPS\x1b[0m ${cwd}> `
}

function runDemoCommand(shell: PreviewShell, command: string): string {
  const trimmed = command.trim()
  if (!trimmed) return demoPrompt(shell.cwd)
  if (trimmed === 'cls' || trimmed === 'clear') return '\x1b[2J\x1b[H' + demoPrompt(shell.cwd)
  if (trimmed === 'pwd') return `${shell.cwd}\r\n${demoPrompt(shell.cwd)}`
  if (trimmed === 'ls' || trimmed === 'dir' || trimmed === 'gci') {
    return [
      '    Каталог: ' + shell.cwd,
      '',
      'Mode   Name              Length',
      '----   ----              ------',
      'd----  src',
      'd----  scripts',
      'd----  resources',
      '-a---  package.json       1 482',
      '-a---  README.md            920',
      '',
      demoPrompt(shell.cwd)
    ].join('\r\n')
  }
  if (trimmed === 'git status' || trimmed === 'git status -s') {
    return [
      'On branch main',
      'Your branch is up to date with \x27origin/main\x27.',
      '',
      'Changes not staged for commit:',
      '  modified:   src/renderer/src/App.tsx',
      '  modified:   src/renderer/src/styles.css',
      '',
      demoPrompt(shell.cwd)
    ].join('\r\n')
  }
  if (trimmed === 'npm run dev' || trimmed === 'npm run typecheck') {
    return [
      '',
      '> closecode@0.1.0 ' + (trimmed.endsWith('dev') ? 'dev' : 'typecheck'),
      '> electron-vite ' + (trimmed.endsWith('dev') ? 'dev' : 'typecheck'),
      '',
      'vite v6.3.5 building for development...',
      '\x1b[32m✓\x1b[0m 0 errors, 0 warnings',
      '',
      demoPrompt(shell.cwd)
    ].join('\r\n')
  }
  return `\x1b[31m${trimmed}\x1b[0m: команда не найдена в демо-терминале\r\n${demoPrompt(shell.cwd)}`
}

async function startTerminal(_options: {
  cols: number
  rows: number
}): Promise<TerminalSessionInfo> {
  const view = await getSettings()
  const cwd = view.activeProjectPath ?? DEMO_ROOT
  const id = `demo-shell-${++previewShellSeq}`
  previewShells.set(id, { id, cwd, line: '' })
  window.setTimeout(() => {
    if (!previewShells.has(id)) return
    emitTerminal(
      id,
      '\x1b[2mWindows PowerShell (демо-режим браузера)\x1b[0m\r\n' + demoPrompt(cwd)
    )
  }, 60)
  return { id, shell: 'pwsh', cwd }
}

function writeTerminal(id: string, data: string): void {
  const shell = previewShells.get(id)
  if (!shell) return
  for (const char of data) {
    if (char === '\r') {
      emitTerminal(id, '\r\n' + runDemoCommand(shell, shell.line))
      shell.line = ''
    } else if (char === '\x7f') {
      if (shell.line) {
        shell.line = shell.line.slice(0, -1)
        emitTerminal(id, '\b \b')
      }
    } else if (char === '\x03') {
      shell.line = ''
      emitTerminal(id, '^C\r\n' + demoPrompt(shell.cwd))
    } else if (char >= ' ') {
      shell.line += char
      emitTerminal(id, char)
    }
  }
}

function resizeTerminal(id: string): void {
  if (!previewShells.has(id)) return
}

function stopTerminal(id: string): void {
  if (!previewShells.delete(id)) return
  for (const listener of terminalExitListeners) listener({ id, exitCode: 0 })
}

function onTerminalData(listener: (event: TerminalDataEvent) => void): () => void {
  terminalDataListeners.add(listener)
  return () => {
    terminalDataListeners.delete(listener)
  }
}

function onTerminalExit(listener: (event: TerminalExitEvent) => void): () => void {
  terminalExitListeners.add(listener)
  return () => {
    terminalExitListeners.delete(listener)
  }
}

export function installPreviewApi(): void {
  const api: CloseCodeApi = {
    getSettings,
    saveSettings,
    setActiveModel,
    fetchModels,
    setLanguage,
    setEffort,
    setAppearance,
    setSecondOpinion,
    setApprovalPolicy,
    setCompactAt,
    addProject,
    openProject,
    removeProject,
    revokeAllowedRoot,
    listSkills,
    setSkillEnabled,
    openSkillsFolder: () => revealFolder('skills'),
    openAgentsFolder: () => revealFolder('agents'),
    revealPath,
    readTree,
    captureScreen,
    readImage,
    getModelLoad,
    getContext,
    getHistory,
    getTaskTitle,
    compactContext,
    sendMessage,
    secondOpinion,
    setPrivateSession,
    cancel,
    resetChat,
    respondApproval,
    answerQuestion,
    getActivity,
    exportChat,
    onAgentEvent: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getWindowState: async () => ({ maximized: false, fullscreen: false }),
    onWindowState: () => () => undefined,
    minimizeWindow: () => undefined,
    toggleMaximizeWindow: async () => ({ maximized: false, fullscreen: false }),
    closeWindow: () => undefined,
    getWindowBounds: async () => ({
      x: window.screenX,
      y: window.screenY,
      width: window.outerWidth,
      height: window.outerHeight
    }),
    resizeWindow: () => undefined,
    startTerminal,
    writeTerminal,
    resizeTerminal,
    stopTerminal,
    onTerminalData,
    onTerminalExit
  }
  window.closecode = api
}
