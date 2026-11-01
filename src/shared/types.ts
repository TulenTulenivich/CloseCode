import type { Lang } from './i18n'
import type { EffortLevel, ModelBrand } from './modelNames'

export type { Lang, EffortLevel, ModelBrand }

export type ProviderKind = 'openai' | 'anthropic'

export type ThemeId = 'graphite' | 'light' | 'midnight'
export type AccentId = 'graphite' | 'lime' | 'violet' | 'blue' | 'rose' | 'amber'
export type DensityId = 'comfy' | 'compact'
export type WindowMode = 'app' | 'terminal'
export type ApprovalPolicy = 'always' | 'smart' | 'never'
export type MotionId = 'full' | 'calm'

export interface AppearancePayload {
  theme: ThemeId
  accent: AccentId
  density: DensityId
  windowMode: WindowMode
  motion: MotionId
  uiScale: number
}

export interface SecondOpinionResult {
  text: string
  model: string
  providerLabel: string
}

export interface ProviderInfo {
  id: string
  label: string
  kind: ProviderKind
  baseUrl: string
  models: string[]
}

export interface ProviderView extends ProviderInfo {
  hasKey: boolean
  free: boolean
}

export interface ProjectInfo {
  path: string
  name: string
  addedAt: number
  lastUsedAt: number
  messages: number
  available: boolean
}

export interface SkillInfo {
  id: string
  name: string
  description: string
  source: 'global' | 'project'
  enabled: boolean
  chars: number
}

export interface AgentInfo {
  id: string
  name: string
  description: string
  model: string | null
  source: 'global' | 'project'
}

export interface SettingsView {
  providers: ProviderView[]
  activeProviderId: string | null
  activeModel: string | null
  projects: ProjectInfo[]
  projectPath: string | null
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
  compactMin: number
  compactMax: number
  skills: SkillInfo[]
  agents: AgentInfo[]
}

export interface ProviderDraft {
  id: string
  label: string
  kind: ProviderKind
  baseUrl: string
  models: string[]
  apiKey?: string
  clearKey?: boolean
}

export interface SaveSettingsPayload {
  providers: ProviderDraft[]
  activeProviderId: string | null
  activeModel: string | null
}

export interface SetActiveModelPayload {
  providerId: string
  model: string
}

export interface SecondOpinionPayload {
  providerId: string | null
  model: string | null
}

export interface FetchModelsPayload {
  providerId?: string
  kind: ProviderKind
  baseUrl: string
  apiKey?: string
  clearKey?: boolean
}

export interface TreePayload {
  path?: string
}

export interface TreeEntry {
  name: string
  path: string
  dir: boolean
}

export interface TreeResult {
  path: string
  entries: TreeEntry[]
  truncated: boolean
}

export interface ScreenShotView {
  name: string
  label: string
  mime: string
  bytes: number
  dataUrl: string
  width: number
  height: number
  displays: number
}

export type ApprovalScope = 'write' | 'read-outside' | 'write-outside' | 'image' | 'image-outside'
export type ApprovalAnswer = 'deny' | 'once' | 'always'
export interface ApprovalImage {
  dataUrl: string
  mime: string
  bytes: number
}

export interface UnlockerStatusView {
  alive: boolean
  port: number
  enabled: boolean
  googleAccount: {
    email: string | null
    hasToken: boolean
    authMethod: string | null
  } | null
}

export interface RemoteControlStatusView {
  running: boolean
  port: number
}

export interface ApprovalRequest {
  id: string
  scope: ApprovalScope
  path: string
  absolutePath: string
  oldContent: string | null
  newContent: string | null
  image?: ApprovalImage | null
}

export interface UserQuestion {
  id: string
  question: string
  options: string[]
  hint?: string
}

export interface ChatAttachment {
  name: string
  size: number
  content: string
  truncated?: boolean
  kind?: 'image'
  mime?: string
}

export interface ContextState {
  used: number
  limit: number
  threshold: number
  estimated?: boolean
}

export interface ModelLoad {
  inflight: number
  requests: number
  activeModel: string | null
  activeBrand: ModelBrand
  firstTokenMs: number | null
  avgFirstTokenMs: number | null
  tokensPerSecond: number | null
  avgTokensPerSecond: number | null
  elapsedMs: number
  outputChars: number
}

export type AgentEvent =
  | { type: 'assistant-start' }
  | { type: 'text-delta'; text: string }
  | {
      type: 'tool-start'
      id: string
      name: string
      args: Record<string, unknown>
      parent?: string | null
      agent?: string | null
    }
  | { type: 'tool-end'; id: string; ok: boolean; detail: string; parent?: string | null }
  | {
      type: 'image'
      id: string
      path: string
      absolutePath: string
      mime: string
      bytes: number
    }
  | {
      type: 'edit'
      id: string
      path: string
      added: number
      removed: number
      kind: 'write' | 'image'
    }
  | { type: 'approval-request'; request: ApprovalRequest }
  | { type: 'approval-resolved'; id: string; approved: boolean }
  | { type: 'approval-auto'; path: string; scope: ApprovalScope }
  | { type: 'question'; question: UserQuestion }
  | { type: 'question-resolved'; id: string; answer: string }
  | { type: 'title'; title: string }
  | { type: 'project'; path: string; name: string }
  | { type: 'context'; context: ContextState }
  | { type: 'load'; load: ModelLoad }
  | { type: 'compact-start'; source: 'auto' | 'manual' }
  | { type: 'compact-end'; ok: boolean; detail: string; context?: ContextState }
  | { type: 'done'; cancelled?: boolean }
  | { type: 'error'; message: string }

export interface RestoredMessage {
  id: string
  role: 'user' | 'assistant' | 'compaction'
  text: string
  files: { name: string; size: number }[]
  images?: { name: string; mime: string; dataUrl: string }[]
  ok?: boolean
}

export interface ActivityDay {
  date: string
  messages: number
  tools: number
  writes: number
}

export interface ActivityView {
  days: ActivityDay[]
  totalMessages: number
  totalTools: number
  totalWrites: number
  activeDays: number
  currentStreak: number
  longestStreak: number
  busiest: number
}

export interface SendMessagePayload {
  text: string
  providerId: string
  model: string
  effort?: EffortLevel
  attachments?: ChatAttachment[]
}

export interface ExportChatPayload {
  defaultName: string
  markdown: string
}

export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface WindowState {
  maximized: boolean
  fullscreen: boolean
}

export interface TerminalSessionInfo {
  id: string
  shell: string
  cwd: string
}

export interface TerminalDataEvent {
  id: string
  data: string
}

export interface TerminalExitEvent {
  id: string
  exitCode: number
}

export interface CloseCodeApi {
  getSettings(): Promise<SettingsView>
  saveSettings(payload: SaveSettingsPayload): Promise<SettingsView>
  setActiveModel(payload: SetActiveModelPayload): Promise<SettingsView>
  fetchModels(payload: FetchModelsPayload): Promise<string[]>
  setLanguage(language: Lang): Promise<SettingsView>
  setEffort(effort: EffortLevel): Promise<SettingsView>
  setAppearance(payload: AppearancePayload): Promise<SettingsView>
  setSecondOpinion(payload: SecondOpinionPayload): Promise<SettingsView>
  setApprovalPolicy(policy: ApprovalPolicy): Promise<SettingsView>
  setCompactAt(percent: number): Promise<SettingsView>
  addProject(): Promise<SettingsView | null>
  openProject(path: string): Promise<SettingsView>
  removeProject(path: string): Promise<SettingsView>
  revokeAllowedRoot(path: string): Promise<SettingsView>
  listSkills(): Promise<SettingsView>
  setSkillEnabled(id: string, enabled: boolean): Promise<SettingsView>
  openSkillsFolder(): Promise<void>
  openAgentsFolder(): Promise<void>
  revealPath(path: string): Promise<void>
  readTree(payload: TreePayload): Promise<TreeResult>
  captureScreen(display: number): Promise<ScreenShotView>
  readImage(path: string): Promise<string>
  getModelLoad(): Promise<ModelLoad>
  getContext(): Promise<ContextState>
  getHistory(): Promise<RestoredMessage[]>
  getTaskTitle(): Promise<string>
  compactContext(): Promise<ContextState>
  sendMessage(payload: SendMessagePayload): Promise<void>
  secondOpinion(): Promise<SecondOpinionResult>
  setPrivateSession(enabled: boolean): Promise<boolean>
  cancel(): Promise<void>
  resetChat(): Promise<void>
  respondApproval(id: string, answer: ApprovalAnswer): Promise<void>
  answerQuestion(id: string, answer: string): Promise<void>
  getActivity(): Promise<ActivityView>
  exportChat(payload: ExportChatPayload): Promise<string | null>
  exportChatJson(defaultName?: string): Promise<string | null>
  getUnlockerStatus(): Promise<UnlockerStatusView>
  setUnlockerEnabled(enabled: boolean): Promise<UnlockerStatusView>
  importAntigravityGoogle(): Promise<SettingsView>
  getRemoteControlStatus(): Promise<RemoteControlStatusView>
  setRemoteControl(enabled: boolean, port?: number): Promise<RemoteControlStatusView>
  onAgentEvent(listener: (event: AgentEvent) => void): () => void
  getWindowState(): Promise<WindowState>
  onWindowState(listener: (state: WindowState) => void): () => void
  minimizeWindow(): void
  toggleMaximizeWindow(): Promise<WindowState>
  closeWindow(): void
  getWindowBounds(): Promise<WindowBounds>
  resizeWindow(bounds: WindowBounds): void
  startTerminal(options: { cols: number; rows: number }): Promise<TerminalSessionInfo>
  writeTerminal(id: string, data: string): void
  resizeTerminal(id: string, cols: number, rows: number): void
  stopTerminal(id: string): void
  onTerminalData(listener: (event: TerminalDataEvent) => void): () => void
  onTerminalExit(listener: (event: TerminalExitEvent) => void): () => void
}
