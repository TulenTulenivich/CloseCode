import fs from 'node:fs'
import path from 'node:path'
import { app, safeStorage } from 'electron'
import type { Lang } from '../shared/i18n'
import {
  FREE_PROVIDER_BASE_URL,
  FREE_PROVIDER_ID,
  FREE_PROVIDER_MODELS,
  freeProviderLabel,
  isFreeProvider
} from '../shared/freeModels'
import {
  clampCompactPercent,
  clampEffort,
  compactMinPercent,
  COMPACT_DEFAULT_PERCENT,
  COMPACT_MAX_PERCENT,
  contextWindowFor,
  defaultEffortFor,
  isImageModel,
  normalizeEffort,
  type EffortLevel
} from '../shared/modelNames'
import type {
  AccentId,
  ApprovalPolicy,
  AppearancePayload,
  DensityId,
  FetchModelsPayload,
  MotionId,
  ProjectInfo,
  ProviderDraft,
  ProviderKind,
  ProviderView,
  SaveSettingsPayload,
  SecondOpinionPayload,
  SettingsView,
  ThemeId,
  WindowMode
} from '../shared/types'
import { setLanguage, tr } from './lang'
import { listAgents, listSkills } from './library'
import { currentProxy, installProxy } from './net'
import { countHistory } from './sessions'

interface StoredProvider {
  id: string
  label: string
  kind: ProviderKind
  baseUrl: string
  models: string[]
  apiKey: string
}

interface StoredProject {
  path: string
  addedAt: number
  lastUsedAt: number
}

const SETTINGS_VERSION = 7

const UI_SCALE_MIN = 90
const UI_SCALE_MAX = 120

const ACCENTS: AccentId[] = ['graphite', 'lime', 'violet', 'blue', 'rose', 'amber']

function accentOf(value: unknown): AccentId | null {
  return ACCENTS.find((id) => id === value) ?? null
}

function clampUiScale(value: unknown): number {
  const percent = Number(value)
  if (!Number.isFinite(percent)) return 100
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, Math.round(percent / 5) * 5))
}

export interface StoredSettings {
  version: typeof SETTINGS_VERSION
  providers: StoredProvider[]
  activeProviderId: string | null
  activeModel: string | null
  projects: StoredProject[]
  activeProjectPath: string | null
  allowedRoots: string[]
  language: Lang
  effort: EffortLevel
  efforts: Record<string, EffortLevel>
  theme: ThemeId
  accent: AccentId
  density: DensityId
  windowMode: WindowMode
  motion: MotionId
  uiScale: number
  opinionProviderId: string | null
  opinionModel: string | null
  approvalPolicy: ApprovalPolicy
  compactAt: number
  enabledSkills: string[]
  freeSeeded: boolean
  proxyUrl: string
}

export interface AgentProvider {
  id: string
  label: string
  kind: ProviderKind
  baseUrl: string
  apiKey: string
  models: string[]
}

let cache: StoredSettings | null = null

function settingsFile(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

function defaults(): StoredSettings {
  return {
    version: SETTINGS_VERSION,
    providers: [],
    activeProviderId: null,
    activeModel: null,
    projects: [],
    activeProjectPath: null,
    allowedRoots: [],
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
    enabledSkills: [],
    freeSeeded: false,
    proxyUrl: ''
  }
}

export function isDirectory(target: string): boolean {
  try {
    return fs.statSync(target).isDirectory()
  } catch {
    return false
  }
}

function samePath(a: string, b: string): boolean {
  const left = path.resolve(a).replace(/[\\/]+$/, '')
  const right = path.resolve(b).replace(/[\\/]+$/, '')
  return process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right
}

export function isPathUnder(root: string, target: string): boolean {
  const resolvedRoot = path.resolve(root).replace(/[\\/]+$/, '')
  const resolvedTarget = path.resolve(target)
  if (process.platform === 'win32') {
    const base = resolvedRoot.toLowerCase()
    const probe = resolvedTarget.toLowerCase()
    return probe === base || probe.startsWith(base + path.sep)
  }
  const rel = path.relative(resolvedRoot, resolvedTarget)
  return rel === '' || (!!rel && !rel.startsWith('..') && !path.isAbsolute(rel))
}

function projectName(target: string): string {
  const resolved = path.resolve(target)
  const base = path.basename(resolved)
  return base || resolved
}

function detectSystemLanguage(): Lang {
  const locale = (app.getLocale() || 'en').toLowerCase()
  return locale.startsWith('ru') ? 'ru' : 'en'
}

function normalizeActive(settings: StoredSettings): void {
  const active = settings.providers.find((provider) => provider.id === settings.activeProviderId)
  if (!active) {
    const first =
      settings.providers.find((provider) => provider.models.length) ?? settings.providers[0]
    settings.activeProviderId = first?.id ?? null
    settings.activeModel = first?.models[0] ?? null
    return
  }
  if (!settings.activeModel || !active.models.includes(settings.activeModel)) {
    settings.activeModel = active.models[0] ?? null
  }
}

function normalizeProjects(settings: StoredSettings): void {
  const seen = new Set<string>()
  const projects: StoredProject[] = []
  for (const project of settings.projects) {
    if (!project || typeof project.path !== 'string' || !project.path.trim()) continue
    const resolved = path.resolve(project.path)
    if ([...seen].some((other) => samePath(other, resolved))) continue
    seen.add(resolved.toLowerCase())
    projects.push({
      path: resolved,
      addedAt: Number.isFinite(project.addedAt) ? project.addedAt : Date.now(),
      lastUsedAt: Number.isFinite(project.lastUsedAt) ? project.lastUsedAt : project.addedAt ?? 0
    })
  }
  projects.sort((a, b) => b.lastUsedAt - a.lastUsedAt)
  settings.projects = projects.slice(0, 24)

  if (
    !settings.activeProjectPath ||
    !settings.projects.some((project) => samePath(project.path, settings.activeProjectPath ?? ''))
  ) {
    settings.activeProjectPath = settings.projects[0]?.path ?? null
  }
}

function normalizeRoots(settings: StoredSettings): void {
  const roots: string[] = []
  for (const root of settings.allowedRoots) {
    if (typeof root !== 'string' || !root.trim()) continue
    const resolved = path.resolve(root.trim())
    if (roots.some((other) => samePath(other, resolved))) continue
    roots.push(resolved)
  }
  settings.allowedRoots = roots.slice(0, 40)
}

function normalizeStored(raw: unknown): StoredSettings {
  const settings = defaults()
  if (!raw || typeof raw !== 'object') return finalize(settings)
  const data = raw as Record<string, unknown>

  if (Array.isArray(data.providers)) {
    const used = new Set<string>()
    for (const item of data.providers) {
      if (!item || typeof item !== 'object') continue
      const provider = item as Record<string, unknown>
      if (typeof provider.id !== 'string' || !provider.id || used.has(provider.id)) continue
      if (typeof provider.baseUrl !== 'string') continue
      used.add(provider.id)
      const models = Array.isArray(provider.models)
        ? provider.models.filter(
            (model): model is string => typeof model === 'string' && !!model.trim()
          )
        : []
      settings.providers.push({
        id: provider.id,
        label:
          typeof provider.label === 'string' && provider.label.trim()
            ? provider.label.trim()
            : 'Provider',
        kind: provider.kind === 'anthropic' ? 'anthropic' : 'openai',
        baseUrl: provider.baseUrl.trim(),
        models,
        apiKey: typeof provider.apiKey === 'string' ? provider.apiKey : ''
      })
    }
  }

  if (typeof data.activeProviderId === 'string') settings.activeProviderId = data.activeProviderId
  if (typeof data.activeModel === 'string') settings.activeModel = data.activeModel

  if (Array.isArray(data.projects)) {
    for (const item of data.projects) {
      if (!item || typeof item !== 'object') continue
      const project = item as Record<string, unknown>
      if (typeof project.path !== 'string' || !project.path.trim()) continue
      settings.projects.push({
        path: project.path,
        addedAt: typeof project.addedAt === 'number' ? project.addedAt : Date.now(),
        lastUsedAt: typeof project.lastUsedAt === 'number' ? project.lastUsedAt : Date.now()
      })
    }
  }
  if (typeof data.projectPath === 'string' && data.projectPath.trim()) {
    settings.projects.push({
      path: data.projectPath,
      addedAt: Date.now(),
      lastUsedAt: Date.now()
    })
    settings.activeProjectPath = data.projectPath
  }
  if (typeof data.activeProjectPath === 'string' && data.activeProjectPath.trim()) {
    settings.activeProjectPath = data.activeProjectPath
  }

  if (Array.isArray(data.allowedRoots)) {
    settings.allowedRoots = data.allowedRoots.filter(
      (root): root is string => typeof root === 'string' && !!root.trim()
    )
  }
  if (data.language === 'ru' || data.language === 'en') settings.language = data.language
  if (typeof data.effort === 'string') settings.effort = normalizeEffort(data.effort)
  if (data.efforts && typeof data.efforts === 'object' && !Array.isArray(data.efforts)) {
    const efforts: Record<string, EffortLevel> = {}
    for (const [key, value] of Object.entries(data.efforts as Record<string, unknown>)) {
      if (!key.trim() || typeof value !== 'string') continue
      efforts[key] = normalizeEffort(value)
    }
    settings.efforts = efforts
  }
  if (data.theme === 'light' || data.theme === 'midnight' || data.theme === 'graphite') {
    settings.theme = data.theme
  }
  const storedAccent = accentOf(data.accent)
  if (storedAccent) settings.accent = storedAccent
  if (!(Number(data.version) >= SETTINGS_VERSION)) {
    settings.theme = 'graphite'
    if (!data.accent || data.accent === 'blue') settings.accent = 'graphite'
  }
  if (data.density === 'compact' || data.density === 'comfy') settings.density = data.density
  if (data.windowMode === 'terminal' || data.windowMode === 'app') settings.windowMode = data.windowMode
  if (data.motion === 'calm' || data.motion === 'full') settings.motion = data.motion
  settings.uiScale = clampUiScale(data.uiScale)
  if (typeof data.opinionProviderId === 'string' && data.opinionProviderId) {
    settings.opinionProviderId = data.opinionProviderId
  }
  if (typeof data.opinionModel === 'string' && data.opinionModel) {
    settings.opinionModel = data.opinionModel
  }
  if (
    data.approvalPolicy === 'always' ||
    data.approvalPolicy === 'smart' ||
    data.approvalPolicy === 'never'
  ) {
    settings.approvalPolicy = data.approvalPolicy
  }
  if (typeof data.compactAt === 'number' && Number.isFinite(data.compactAt)) {
    settings.compactAt = Math.round(data.compactAt)
  }
  if (Array.isArray(data.enabledSkills)) {
    settings.enabledSkills = data.enabledSkills.filter(
      (id): id is string => typeof id === 'string' && !!id.trim()
    )
  }
  settings.freeSeeded = data.freeSeeded === true
  if (typeof data.proxyUrl === 'string') settings.proxyUrl = data.proxyUrl.trim()

  return finalize(settings)
}

function activeLimit(settings: StoredSettings): number {
  return settings.activeModel ? contextWindowFor(settings.activeModel) : 128_000
}

function finalize(settings: StoredSettings): StoredSettings {
  if (!settings.freeSeeded) {
    settings.freeSeeded = true
    if (!settings.providers.some((provider) => provider.id === FREE_PROVIDER_ID)) {
      settings.providers.unshift({
        id: FREE_PROVIDER_ID,
        label: freeProviderLabel(settings.language),
        kind: 'openai',
        baseUrl: FREE_PROVIDER_BASE_URL,
        models: [...FREE_PROVIDER_MODELS],
        apiKey: ''
      })
    }
  }
  normalizeProjects(settings)
  normalizeRoots(settings)
  normalizeActive(settings)
  const reviewer = settings.providers.find((provider) => provider.id === settings.opinionProviderId)
  if (!reviewer || !settings.opinionModel || !reviewer.models.includes(settings.opinionModel)) {
    settings.opinionProviderId = null
    settings.opinionModel = null
  }
  if (!settings.projects.some((project) => samePath(project.path, settings.activeProjectPath ?? ''))) {
    settings.activeProjectPath = settings.projects[0]?.path ?? null
  }
  settings.compactAt = clampCompactPercent(settings.compactAt, activeLimit(settings))
  if (!settings.allowedRoots.length) settings.allowedRoots = []
  return settings
}

function relabelFreeProvider(settings: StoredSettings): void {
  const provider = settings.providers.find((item) => item.id === FREE_PROVIDER_ID)
  if (!provider) return
  const placeholders = [freeProviderLabel('ru'), freeProviderLabel('en')]
  if (placeholders.includes(provider.label.trim())) provider.label = freeProviderLabel(settings.language)
}

function load(): StoredSettings {
  if (cache) return cache
  let parsed: unknown = null
  let wasSeeded = false
  try {
    parsed = JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) as unknown
    wasSeeded = Boolean((parsed as { freeSeeded?: unknown } | null)?.freeSeeded)
  } catch {
    parsed = null
  }
  if (parsed) {
    cache = finalize(normalizeStored(parsed))
  } else {
    const fresh = defaults()
    fresh.language = detectSystemLanguage()
    cache = finalize(fresh)
  }
  if (!wasSeeded) persist(cache)
  setLanguage(cache.language)
  return cache
}

function persist(settings: StoredSettings): void {
  const file = settingsFile()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const json = JSON.stringify(settings, null, 2)
  const temp = `${file}.tmp`
  try {
    fs.writeFileSync(temp, json, { encoding: 'utf8', mode: 0o600 })
    fs.renameSync(temp, file)
  } catch {
    fs.writeFileSync(file, json, 'utf8')
    try {
      fs.unlinkSync(temp)
    } catch {
    }
  }
  cache = settings
  setLanguage(settings.language)
}

function encryptSecret(plain: string): string {
  if (!plain) return ''
  if (safeStorage.isEncryptionAvailable()) {
    return `safe:${safeStorage.encryptString(plain).toString('base64')}`
  }
  return `raw:${Buffer.from(plain, 'utf8').toString('base64')}`
}

function decryptSecret(stored: string): string {
  if (!stored) return ''
  try {
    if (stored.startsWith('safe:')) {
      return safeStorage.decryptString(Buffer.from(stored.slice(5), 'base64'))
    }
    if (stored.startsWith('raw:')) {
      return Buffer.from(stored.slice(4), 'base64').toString('utf8')
    }
    return stored
  } catch {
    return ''
  }
}

function toProjectInfo(settings: StoredSettings, liveMessages?: number): ProjectInfo[] {
  return settings.projects.map((project) => ({
    path: project.path,
    name: projectName(project.path),
    addedAt: project.addedAt,
    lastUsedAt: project.lastUsedAt,
    available: isDirectory(project.path),
    messages:
      liveMessages !== undefined && samePath(project.path, settings.activeProjectPath ?? '')
        ? liveMessages
        : countHistory(project.path)
  }))
}

function toView(settings: StoredSettings, liveMessages?: number): SettingsView {
  const providers: ProviderView[] = settings.providers.map((provider) => ({
    id: provider.id,
    label: provider.label,
    kind: provider.kind,
    baseUrl: provider.baseUrl,
    models: [...provider.models],
    hasKey: decryptSecret(provider.apiKey).length > 0,
    free: isFreeProvider(provider)
  }))
  const projects = toProjectInfo(settings, liveMessages)
  const active = projects.find((project) => samePath(project.path, settings.activeProjectPath ?? ''))
  const activePath = active?.available ? active.path : null
  const limit = activeLimit(settings)
  const effort = settings.activeModel
    ? clampEffort(
        settings.activeModel,
        settings.efforts[settings.activeModel] ?? defaultEffortFor(settings.activeModel)
      )
    : settings.effort
  return {
    providers,
    activeProviderId: settings.activeProviderId,
    activeModel: settings.activeModel,
    projects,
    projectPath: activePath,
    activeProjectPath: activePath,
    allowedRoots: [...settings.allowedRoots],
    language: settings.language,
    effort,
    efforts: { ...settings.efforts },
    theme: settings.theme,
    accent: settings.accent,
    density: settings.density,
    windowMode: settings.windowMode,
    motion: settings.motion,
    uiScale: settings.uiScale,
    opinionProviderId: settings.opinionProviderId,
    opinionModel: settings.opinionModel,
    approvalPolicy: settings.approvalPolicy,
    compactAt: clampCompactPercent(settings.compactAt, limit),
    compactMin: compactMinPercent(limit),
    compactMax: COMPACT_MAX_PERCENT,
    proxyUrl: currentProxy() ?? '',
    skills: listSkills(activePath, settings.enabledSkills),
    agents: listAgents(activePath)
  }
}

function dedupeModels(models: unknown): string[] {
  if (!Array.isArray(models)) return []
  const result: string[] = []
  const seen = new Set<string>()
  for (const model of models) {
    if (typeof model !== 'string') continue
    const trimmed = model.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    result.push(trimmed)
  }
  return result
}

function cleanBaseUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(tr('e.badBaseUrl'))
  const trimmed = value.trim().replace(/\/+$/, '')
  try {
    new URL(trimmed)
  } catch {
    return trimmed
  }
  return trimmed
}

export function getLanguage(): Lang {
  return load().language
}

export function getEffort(): EffortLevel {
  const settings = load()
  if (!settings.activeModel) return settings.effort
  return clampEffort(
    settings.activeModel,
    settings.efforts[settings.activeModel] ?? defaultEffortFor(settings.activeModel)
  )
}

export function getApprovalPolicy(): ApprovalPolicy {
  return load().approvalPolicy
}

export function getCompactRatio(): number {
  const settings = load()
  return clampCompactPercent(settings.compactAt, activeLimit(settings)) / 100
}

export function getSettingsView(liveMessages?: number): SettingsView {
  return toView(load(), liveMessages)
}

export function saveSettings(payload: SaveSettingsPayload): SettingsView {
  if (!payload || !Array.isArray(payload.providers)) throw new Error(tr('e.badSettings'))
  const current = load()
  const providers: StoredProvider[] = []
  const used = new Set<string>()

  for (const draft of payload.providers as ProviderDraft[]) {
    if (!draft || typeof draft.id !== 'string' || !draft.id || used.has(draft.id)) continue
    used.add(draft.id)
    const existing = current.providers.find((provider) => provider.id === draft.id)
    let apiKey = existing?.apiKey ?? ''
    if (draft.clearKey) apiKey = ''
    if (typeof draft.apiKey === 'string' && draft.apiKey.trim()) {
      apiKey = encryptSecret(draft.apiKey.trim())
    }
    providers.push({
      id: draft.id,
      label:
        typeof draft.label === 'string' && draft.label.trim() ? draft.label.trim() : 'Provider',
      kind: draft.kind === 'anthropic' ? 'anthropic' : 'openai',
      baseUrl: cleanBaseUrl(draft.baseUrl),
      models: dedupeModels(draft.models),
      apiKey
    })
  }

  const next: StoredSettings = {
    ...current,
    providers,
    activeProviderId:
      typeof payload.activeProviderId === 'string' ? payload.activeProviderId : null,
    activeModel: typeof payload.activeModel === 'string' ? payload.activeModel : null
  }
  persist(finalize(next))
  return getSettingsView()
}

export function setActiveModel(providerId: string, model: string): SettingsView {
  const settings = load()
  const provider = settings.providers.find((item) => item.id === providerId)
  if (!provider) throw new Error(tr('e.noProvider'))
  if (!provider.models.includes(model)) throw new Error(tr('e.modelNotListed'))
  settings.activeProviderId = providerId
  settings.activeModel = model
  persist(finalize(settings))
  return getSettingsView()
}

export function setLanguageSetting(language: Lang): SettingsView {
  const settings = load()
  settings.language = language === 'en' ? 'en' : 'ru'
  relabelFreeProvider(settings)
  persist(settings)
  return getSettingsView()
}

export function setEffortSetting(effort: EffortLevel): SettingsView {
  const settings = load()
  const value = normalizeEffort(effort)
  settings.effort = value
  if (settings.activeModel) {
    settings.efforts[settings.activeModel] = clampEffort(settings.activeModel, value)
  }
  persist(settings)
  return getSettingsView()
}

export function setAppearanceSetting(payload: AppearancePayload): SettingsView {
  if (!payload || typeof payload !== 'object') throw new Error(tr('e.badSettings'))
  const settings = load()
  if (payload.theme === 'graphite' || payload.theme === 'light' || payload.theme === 'midnight') {
    settings.theme = payload.theme
  }
  const accent = accentOf(payload.accent)
  if (accent) settings.accent = accent
  if (payload.density === 'comfy' || payload.density === 'compact') {
    settings.density = payload.density
  }
  if (payload.windowMode === 'app' || payload.windowMode === 'terminal') {
    settings.windowMode = payload.windowMode
  }
  if (payload.motion === 'full' || payload.motion === 'calm') settings.motion = payload.motion
  settings.uiScale = clampUiScale(payload.uiScale)
  persist(settings)
  return getSettingsView()
}

export function setSecondOpinionSetting(payload: SecondOpinionPayload): SettingsView {
  const settings = load()
  const providerId = typeof payload?.providerId === 'string' ? payload.providerId : null
  const model = typeof payload?.model === 'string' ? payload.model : null
  const provider = settings.providers.find((item) => item.id === providerId)
  if (!provider || !model || !provider.models.includes(model) || isImageModel(model)) {
    settings.opinionProviderId = null
    settings.opinionModel = null
  } else {
    settings.opinionProviderId = provider.id
    settings.opinionModel = model
  }
  persist(finalize(settings))
  return getSettingsView()
}

export function getUiScaleFactor(): number {
  return load().uiScale / 100
}

export function setApprovalPolicySetting(policy: ApprovalPolicy): SettingsView {
  const settings = load()
  if (policy === 'always' || policy === 'smart' || policy === 'never') {
    settings.approvalPolicy = policy
  }
  persist(settings)
  return getSettingsView()
}

export function setCompactAtSetting(percent: number): SettingsView {
  const settings = load()
  settings.compactAt = clampCompactPercent(percent, activeLimit(settings))
  persist(settings)
  return getSettingsView()
}

export function setProxySetting(raw: unknown): SettingsView {
  const settings = load()
  settings.proxyUrl = installProxy(raw)
  persist(settings)
  return getSettingsView()
}

export function getStoredProxy(): string {
  return load().proxyUrl
}

export function addProject(target: string): SettingsView {
  const settings = load()
  const resolved = path.resolve(target)
  const existing = settings.projects.find((project) => samePath(project.path, resolved))
  if (existing) {
    existing.path = resolved
    existing.lastUsedAt = Date.now()
  } else {
    settings.projects.push({ path: resolved, addedAt: Date.now(), lastUsedAt: Date.now() })
  }
  settings.activeProjectPath = resolved
  persist(finalize(settings))
  return getSettingsView()
}

export function setActiveProject(target: string): SettingsView {
  const settings = load()
  const project = settings.projects.find((item) => samePath(item.path, target))
  if (!project) throw new Error(tr('s.missing'))
  if (!isDirectory(project.path)) throw new Error(tr('s.missing'))
  project.lastUsedAt = Date.now()
  settings.activeProjectPath = project.path
  persist(settings)
  return getSettingsView()
}

export function removeProject(target: string): SettingsView {
  const settings = load()
  settings.projects = settings.projects.filter((project) => !samePath(project.path, target))
  if (!settings.projects.some((project) => samePath(project.path, settings.activeProjectPath ?? ''))) {
    settings.activeProjectPath = settings.projects[0]?.path ?? null
  }
  persist(settings)
  return getSettingsView()
}

export function getAllowedRoots(): string[] {
  return [...load().allowedRoots]
}

export function findGrantRoot(absolutePath: string): string | null {
  const target = path.resolve(absolutePath)
  return (
    load()
      .allowedRoots.filter((root) => isPathUnder(root, target))
      .sort((a, b) => b.length - a.length)[0] ?? null
  )
}

export function addAllowedRoot(target: string): SettingsView {
  const settings = load()
  const resolved = path.resolve(target)
  if (!settings.allowedRoots.some((root) => samePath(root, resolved))) {
    settings.allowedRoots.push(resolved)
  }
  persist(finalize(settings))
  return getSettingsView()
}

export function revokeAllowedRoot(target: string): SettingsView {
  const settings = load()
  settings.allowedRoots = settings.allowedRoots.filter((root) => !samePath(root, target))
  persist(finalize(settings))
  return getSettingsView()
}

export function getEnabledSkills(): string[] {
  return [...load().enabledSkills]
}

export function setSkillEnabledSetting(id: string, enabled: boolean): SettingsView {
  const settings = load()
  const next = new Set(settings.enabledSkills)
  if (enabled) next.add(id)
  else next.delete(id)
  settings.enabledSkills = [...next]
  persist(settings)
  return getSettingsView()
}

export function resolveApiKeyForRequest(payload: FetchModelsPayload): string {
  if (typeof payload.apiKey === 'string' && payload.apiKey.trim()) return payload.apiKey.trim()
  if (payload.clearKey) return ''
  if (payload.providerId) {
    const provider = load().providers.find((item) => item.id === payload.providerId)
    if (provider) return decryptSecret(provider.apiKey)
  }
  return ''
}

export function getAgentProvider(providerId: string): AgentProvider | null {
  const provider = load().providers.find((item) => item.id === providerId)
  if (!provider) return null
  return {
    id: provider.id,
    label: provider.label,
    kind: provider.kind,
    baseUrl: provider.baseUrl,
    apiKey: decryptSecret(provider.apiKey),
    models: [...provider.models]
  }
}

export function getProjectPath(): string | null {
  const settings = load()
  const project = settings.projects.find((item) =>
    samePath(item.path, settings.activeProjectPath ?? '')
  )
  if (!project || !isDirectory(project.path)) return null
  return project.path
}
