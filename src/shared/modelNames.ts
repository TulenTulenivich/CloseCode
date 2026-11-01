import type { ProviderKind } from './types'

export type ModelBrand =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'deepseek'
  | 'mistral'
  | 'groq'
  | 'xai'
  | 'ollama'
  | 'openrouter'
  | 'github'
  | 'azure'
  | 'aws'
  | 'huggingface'
  | 'cohere'
  | 'perplexity'
  | 'together'
  | 'fireworks'
  | 'moonshot'
  | 'qwen'
  | 'zhipu'
  | 'minimax'
  | 'nvidia'
  | 'cerebras'
  | 'sambanova'
  | 'codeium'
  | 'cursor'
  | 'lmstudio'
  | 'meta'
  | 'apple'
  | 'stability'
  | 'baidu'
  | 'tencent'
  | 'volcengine'
  | 'opencode'
  | 'generic'

export const brandLabels: Record<ModelBrand, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  deepseek: 'DeepSeek',
  mistral: 'Mistral',
  groq: 'Groq',
  xai: 'xAI',
  ollama: 'Ollama',
  openrouter: 'OpenRouter',
  github: 'GitHub Copilot',
  azure: 'Azure',
  aws: 'AWS Bedrock',
  huggingface: 'Hugging Face',
  cohere: 'Cohere',
  perplexity: 'Perplexity',
  together: 'Together AI',
  fireworks: 'Fireworks',
  moonshot: 'Moonshot',
  qwen: 'Qwen',
  zhipu: 'Z.ai',
  minimax: 'MiniMax',
  nvidia: 'NVIDIA',
  cerebras: 'Cerebras',
  sambanova: 'SambaNova',
  codeium: 'Codeium',
  cursor: 'Cursor',
  lmstudio: 'LM Studio',
  meta: 'Meta',
  apple: 'Apple',
  stability: 'Stability AI',
  baidu: 'Baidu',
  tencent: 'Tencent',
  volcengine: 'Volcengine',
  opencode: 'OpenCode',
  generic: 'Model'
}

const BRAND_HINTS: [ModelBrand, string[]][] = [
  ['anthropic', ['anthropic', 'claude', 'sonnet', 'opus', 'haiku']],
  ['openai', ['openai', 'chatgpt', 'gpt-', 'gpt4', 'gpt-4', 'o1', 'o3', 'o4', 'codex', 'text-embedding', 'whisper', 'tts-']],
  ['google', ['google', 'gemini', 'gemma', 'palm', 'bard']],
  ['deepseek', ['deepseek', 'deepseek-', 'kimi']],
  ['mistral', ['mistral', 'mixtral', 'devstral', 'magistral', 'pixtral', 'le-chat', 'codestral']],
  ['groq', ['groq', 'llama-3.3-70b', 'meta-llama/llama']],
  ['xai', ['xai', 'grok']],
  ['ollama', ['ollama', 'ollama:']],
  ['openrouter', ['openrouter']],
  ['github', ['github', 'copilot']],
  ['azure', ['azure', 'aoai']],
  ['aws', ['bedrock', 'amazon', 'titan', 'nova-']],
  ['huggingface', ['huggingface', 'huggingface.co']],
  ['cohere', ['cohere', 'command-r', 'north', 'embed-']],
  ['perplexity', ['perplexity', 'sonar']],
  ['together', ['together']],
  ['fireworks', ['fireworks']],
  ['moonshot', ['moonshot', 'kimi-']],
  ['qwen', ['qwen', 'qwq', 'tongyi', 'turbopq']],
  ['zhipu', ['zhipu', 'glm-', 'chatglm', 'z-ai']],
  ['minimax', ['minimax', 'abab']],
  ['nvidia', ['nvidia', 'nemotron']],
  ['cerebras', ['cerebras']],
  ['sambanova', ['sambanova']],
  ['codeium', ['codeium', 'windsurf']],
  ['cursor', ['cursor']],
  ['lmstudio', ['lmstudio', 'lm-studio']],
  ['meta', ['meta-llama', 'llama3', 'llama-3', 'llama2', 'llama-2']],
  ['apple', ['apple', 'openelm']],
  ['stability', ['stability']],
  ['baidu', ['ernie', 'qianfan', 'baidu']],
  ['tencent', ['hunyuan', 'tencent']],
  ['volcengine', ['volc', 'doubao', 'ark']],
  ['opencode', ['opencode']]
]

function brandFromUrl(value: string): ModelBrand | null {
  const url = value.toLowerCase()
  if (url.includes('azure') || url.includes('aoai')) return 'azure'
  if (url.includes('anthropic')) return 'anthropic'
  if (url.includes('openai')) return 'openai'
  if (url.includes('generativelanguage') || url.includes('googleapis')) return 'google'
  if (url.includes('deepseek')) return 'deepseek'
  if (url.includes('mistral')) return 'mistral'
  if (url.includes('groq')) return 'groq'
  if (url.includes('x.ai') || url.includes('xai')) return 'xai'
  if (url.includes('localhost:11434') || url.includes('ollama')) return 'ollama'
  if (url.includes('openrouter')) return 'openrouter'
  if (url.includes('githubcopilot') || url.includes('copilot')) return 'github'
  if (url.includes('bedrock') || url.includes('amazonaws')) return 'aws'
  if (url.includes('cohere')) return 'cohere'
  if (url.includes('perplexity')) return 'perplexity'
  if (url.includes('together')) return 'together'
  if (url.includes('fireworks')) return 'fireworks'
  if (url.includes('moonshot')) return 'moonshot'
  if (url.includes('zhipu') || url.includes('bigmodel')) return 'zhipu'
  if (url.includes('minimax')) return 'minimax'
  if (url.includes('lmstudio') || url.includes('localhost:1234')) return 'lmstudio'
  if (url.includes('cerebras')) return 'cerebras'
  if (url.includes('sambanova')) return 'sambanova'
  if (url.includes('nvidia')) return 'nvidia'
  if (url.includes('baidubce') || url.includes('qianfan')) return 'baidu'
  if (url.includes('tencent') || url.includes('hunyuan')) return 'tencent'
  if (url.includes('volces') || url.includes('volcengine')) return 'volcengine'
  if (url.includes('huggingface')) return 'huggingface'
  if (url.includes('opencode')) return 'opencode'
  return null
}

function scan(value: string): ModelBrand | null {
  const haystack = ` ${value.toLowerCase()} `
  for (const [brand, hints] of BRAND_HINTS) {
    for (const hint of hints) if (haystack.includes(hint)) return brand
  }
  return null
}

export function detectBrand(...candidates: (string | null | undefined)[]): ModelBrand {
  for (const candidate of candidates) {
    if (!candidate) continue
    const brand = scan(candidate) ?? (candidates.length > 1 ? brandFromUrl(candidate) : null)
    if (brand) return brand
  }
  return 'generic'
}

export function brandForProviderInfo(
  label: string,
  baseUrl: string,
  kind: ProviderKind
): ModelBrand {
  const explicit = detectBrand(label)
  if (explicit !== 'generic') return explicit
  return brandFromUrl(baseUrl) ?? (kind === 'anthropic' ? 'anthropic' : 'generic')
}

const WORD_FIXES: Record<string, string> = {
  gpt: 'GPT',
  api: 'API',
  ai: 'AI',
  tts: 'TTS',
  stt: 'STT',
  vl: 'VL',
  lfm: 'LFM',
  o1: 'o1',
  o3: 'o3',
  o4: 'o4',
  r1: 'R1',
  r: 'R',
  glm: 'GLM',
  kimi: 'Kimi',
  qwen: 'Qwen',
  qwq: 'QwQ',
  llama: 'Llama',
  alpaca: 'Alpaca',
  gemma: 'Gemma',
  gemini: 'Gemini',
  claude: 'Claude',
  deepseek: 'DeepSeek',
  mistral: 'Mistral',
  mixtral: 'Mixtral',
  codestral: 'Codestral',
  devstral: 'Devstral',
  magistral: 'Magistral',
  pixtral: 'Pixtral',
  codellama: 'Code Llama',
  codegemma: 'Code Gemma',
  phi: 'Phi',
  grok: 'Grok',
  nova: 'Nova',
  titan: 'Titan',
  command: 'Command',
  sonar: 'Sonar',
  nemotron: 'Nemotron',
  hunyuan: 'Hunyuan',
  doubao: 'Doubao',
  ernie: 'ERNIE',
  abab: 'ABab',
  sonnet: 'Sonnet',
  opus: 'Opus',
  haiku: 'Haiku',
  instant: 'Instant',
  thinking: 'Thinking',
  think: 'Think',
  reasoning: 'Reasoning',
  researcher: 'Researcher',
  vision: 'Vision',
  audio: 'Audio',
  image: 'Image',
  video: 'Video',
  realtime: 'Realtime',
  translator: 'Translator',
  coder: 'Coder',
  code: 'Code',
  chat: 'Chat',
  instruct: 'Instruct',
  turbo: 'Turbo',
  preview: 'Preview',
  latest: 'Latest',
  experimental: 'Experimental',
  mini: 'Mini',
  nano: 'Nano',
  large: 'Large',
  medium: 'Medium',
  small: 'Small',
  lite: 'Lite',
  pro: 'Pro',
  max: 'Max',
  plus: 'Plus',
  flash: 'Flash',
  best: 'Best',
  faster: 'Faster',
  cheaper: 'Cheaper',
  free: 'Free',
  open: 'Open',
  base: 'Base',
  it: 'IT',
  dialog: 'Dialog',
  stepfun: 'StepFun',
  skywork: 'SkyWork',
  wind: 'Wind',
  smol: 'Smol',
  weights: 'Weights',
  connected: 'Connected'
}

const DROP_TOKENS = new Set([
  'v0',
  'v1',
  '001',
  '002',
  '01',
  '1019',
  'latest0',
  'model',
  'models',
  'default',
  'stable',
  'text',
  'completion',
  'completions',
  'output',
  'input'
])

function isSize(token: string): boolean {
  return /^\d+(\.\d+)?x?\d*b$/.test(token) || /^a\d+b$/.test(token) || /^\d+b$/.test(token)
}

function isDateStamp(token: string): boolean {
  return /^20\d{6}$/.test(token) || /^20\d{2}-\d{2}-\d{2}$/.test(token)
}

function capitalize(token: string): string {
  return token.charAt(0).toUpperCase() + token.slice(1)
}

export function prettyModelName(raw: string): string {
  const withoutTag = raw.includes(':') ? raw.replace(/^([^:]+):(.+)$/, '$1 $2') : raw
  const parts = withoutTag.split('/')
  const tail = parts[parts.length - 1] || raw
  const tokens = tail
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .filter(Boolean)

  const words: string[] = []
  let numberRun: string[] = []

  const flushNumbers = (): void => {
    if (!numberRun.length) return
    const joined = numberRun.join('.')
    const rest = numberRun.slice(1)
    words.push(rest.length && rest.every((item) => item.length <= 2) ? joined : numberRun.join(' '))
    numberRun = []
  }

  for (const token of tokens) {
    if (isDateStamp(token)) continue
    if (/^\d+(\.\d+)*$/.test(token)) {
      numberRun.push(token)
      continue
    }
    flushNumbers()
    if (isSize(token)) {
      words.push(token.toUpperCase())
      continue
    }
    if (DROP_TOKENS.has(token)) continue
    const fixed = WORD_FIXES[token]
    if (fixed) {
      words.push(fixed)
      continue
    }
    const split = token.match(/^([a-z]+)(\d+(?:\.\d+)?)$/)
    if (split) {
      const head = WORD_FIXES[split[1]] ?? capitalize(split[1])
      words.push(head, split[2])
      continue
    }
    words.push(capitalize(token))
  }
  flushNumbers()

  const cleaned = words
    .filter((word, index) => word && word !== words[index - 1])
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || raw
}

export function modelNamespace(raw: string): string | null {
  const index = raw.lastIndexOf('/')
  if (index <= 0) return null
  const namespace = raw.slice(0, index).trim()
  return namespace || null
}

export function modelTechnicalName(raw: string): string {
  const index = raw.lastIndexOf('/')
  return index >= 0 ? raw.slice(index + 1) : raw
}

export interface ModelPresentation {
  display: string
  raw: string
  namespace: string | null
  brand: ModelBrand
}

export function presentModel(
  raw: string,
  providerLabel?: string | null,
  baseUrl?: string | null
): ModelPresentation {
  const brand =
    detectBrand(raw) !== 'generic'
      ? detectBrand(raw)
      : (detectBrand(providerLabel ?? '') ?? detectBrand(baseUrl ?? ''))
  return {
    display: prettyModelName(raw),
    raw,
    namespace: modelNamespace(raw),
    brand: brand === 'generic' ? detectBrand(providerLabel ?? '', baseUrl ?? '') : brand
  }
}

const EFFORT_ALIASES: Record<string, EffortLevel> = {
  fast: 'low',
  minimal: 'minimal',
  low: 'low',
  balanced: 'medium',
  medium: 'medium',
  deep: 'high',
  high: 'high',
  xhigh: 'xhigh',
  max: 'max',
  maximum: 'max'
}

export type EffortLevel = 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export const EFFORT_LEVELS: EffortLevel[] = ['minimal', 'low', 'medium', 'high', 'xhigh', 'max']

export const EFFORT_RANK: Record<EffortLevel, number> = {
  minimal: 0,
  low: 1,
  medium: 2,
  high: 3,
  xhigh: 4,
  max: 5
}

export function normalizeEffort(value: unknown): EffortLevel {
  const key = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return EFFORT_ALIASES[key] ?? 'medium'
}

export type EffortScaleKey =
  | 'gpt5'
  | 'gpt51'
  | 'claude'
  | 'balanced'
  | 'reasoning'
  | 'qwen'
  | 'dual'
  | 'standard'

const EFFORT_SCALES: Record<EffortScaleKey, EffortLevel[]> = {
  gpt5: ['minimal', 'low', 'medium', 'high'],
  gpt51: ['low', 'medium', 'high'],
  claude: ['low', 'medium', 'high', 'max'],
  balanced: ['low', 'medium', 'high'],
  reasoning: ['low', 'medium', 'high'],
  qwen: ['low', 'medium', 'xhigh'],
  dual: ['low', 'high'],
  standard: ['low', 'medium', 'high']
}

export interface EffortScale {
  key: EffortScaleKey
  levels: EffortLevel[]
  native: boolean
}

export function effortScaleFor(model: string): EffortScale {
  const id = model.toLowerCase()
  if (/gpt-?5[.-]?1|gpt-?5\.1/.test(id)) {
    return { key: 'gpt51', levels: [...EFFORT_SCALES.gpt51], native: true }
  }
  if (/gpt-?5/.test(id) || /(^|[/-])(o[134]|o\d-)/.test(id) || id.includes('codex')) {
    return { key: 'gpt5', levels: [...EFFORT_SCALES.gpt5], native: true }
  }
  if (id.includes('claude')) {
    const compact = id.includes('haiku') || /claude-3[.-]/.test(id) || id.includes('instant')
    const supportsMax = /(opus|sonnet)[-_]?4|claude-4/.test(id) && !/3[.-]7/.test(id)
    const levels: EffortLevel[] = compact
      ? ['low', 'medium', 'high']
      : supportsMax
        ? ['low', 'medium', 'high', 'max']
        : ['low', 'medium', 'high']
    return { key: 'claude', levels, native: !compact }
  }
  if (id.includes('gemini') || id.includes('gemma')) {
    return { key: 'balanced', levels: [...EFFORT_SCALES.balanced], native: id.includes('gemini') }
  }
  if (/deepseek.*(r1|reasoner)|deepseek-reasoner/.test(id)) {
    return { key: 'dual', levels: [...EFFORT_SCALES.dual], native: true }
  }
  if (id.includes('grok')) return { key: 'dual', levels: [...EFFORT_SCALES.dual], native: true }
  if (id.includes('qwen') || id.includes('qwq')) {
    return { key: 'qwen', levels: [...EFFORT_SCALES.qwen], native: true }
  }
  if (id.includes('kimi') || id.includes('glm') || id.includes('minimax') || id.includes('thinking')) {
    return { key: 'balanced', levels: [...EFFORT_SCALES.balanced], native: true }
  }
  return { key: 'standard', levels: [...EFFORT_SCALES.standard], native: false }
}

export function effortOptionsFor(model: string): EffortLevel[] {
  return effortScaleFor(model).levels
}

export function supportsEffort(model: string): boolean {
  return effortScaleFor(model).native
}

export function isHighEffort(effort: EffortLevel): boolean {
  return EFFORT_RANK[effort] >= EFFORT_RANK.high
}

export function defaultEffortFor(model: string): EffortLevel {
  const options = effortOptionsFor(model)
  return options.includes('medium') ? 'medium' : options[0]
}

export function clampEffort(model: string, effort: EffortLevel): EffortLevel {
  const options = effortOptionsFor(model)
  if (options.includes(effort)) return effort
  const rank = EFFORT_RANK[effort]
  return [...options].sort(
    (a, b) => Math.abs(EFFORT_RANK[a] - rank) - Math.abs(EFFORT_RANK[b] - rank)
  )[0]
}

export function reasoningEffortFor(model: string, effort: EffortLevel): string | null {
  const id = model.toLowerCase()
  if (id.includes('claude')) return null
  const reasoningModel =
    /(^|[/-])(o[134]|o\d-|gpt-5|deepseek-r|qwq|qwen3|kimi-reasoning)/.test(id) ||
    id.includes('thinking') ||
    id.includes('reasoner')
  if (!reasoningModel) return null
  const level = clampEffort(model, effort)
  if (level === 'max' || level === 'xhigh') return 'high'
  if (level === 'minimal') return id.includes('gpt-5') && !/gpt-?5[.-]?1/.test(id) ? 'minimal' : 'low'
  return level
}

export function thinkingBudgetFor(model: string, effort: EffortLevel): number | null {
  const id = model.toLowerCase()
  const supportsThinking = /claude-(3-7|4|sonnet-4|opus-4|\d+\.\d+-(opus|sonnet))/.test(id)
  if (!supportsThinking) return null
  switch (clampEffort(model, effort)) {
    case 'low':
      return 1024
    case 'medium':
      return 4096
    case 'high':
      return 8192
    case 'xhigh':
      return 12000
    case 'max':
      return 16000
    default:
      return null
  }
}

export function temperatureFor(effort: EffortLevel): number {
  switch (effort) {
    case 'minimal':
      return 0.1
    case 'low':
      return 0.2
    case 'medium':
      return 0.6
    case 'high':
      return 0.8
    case 'xhigh':
      return 0.9
    default:
      return 1
  }
}

export function maxTokensFor(effort: EffortLevel): number {
  switch (effort) {
    case 'minimal':
      return 2048
    case 'low':
      return 4096
    case 'medium':
      return 8192
    case 'high':
      return 16384
    case 'xhigh':
      return 24576
    default:
      return 32000
  }
}

const IMAGE_MODEL_HINTS = [
  'dall-e',
  'dalle',
  'gpt-image',
  'imagen',
  'imagegen',
  'flux',
  'stable-diffusion',
  'sdxl',
  'recraft',
  'ideogram',
  'qwen-image',
  'seedream',
  'wanx',
  'cogview',
  'hidream',
  'kandinsky',
  'kolors',
  'midjourney'
]

const IMAGE_SEGMENT = /(^|[/\-_.])images?([/\-_.]|$)/
const SD_SEGMENT = /(^|[/\-_.])sd[0-9x]+([/\-_.]|$)/

export function isImageModel(raw: string): boolean {
  const id = raw.trim().toLowerCase()
  if (!id) return false
  if (IMAGE_MODEL_HINTS.some((hint) => id.includes(hint))) return true
  return IMAGE_SEGMENT.test(id) || SD_SEGMENT.test(id)
}

export const COMPACT_RESERVE_TOKENS = 24_000
export const COMPACT_DEFAULT_PERCENT = 80
export const COMPACT_MAX_PERCENT = 95

export function compactMinPercent(limit: number): number {
  return Math.min(90, Math.max(15, Math.ceil((COMPACT_RESERVE_TOKENS / Math.max(1, limit)) * 100)))
}

export function clampCompactPercent(percent: number, limit: number): number {
  const safe = Number.isFinite(percent) ? Math.round(percent) : COMPACT_DEFAULT_PERCENT
  return Math.min(COMPACT_MAX_PERCENT, Math.max(compactMinPercent(limit), safe))
}

export function contextWindowFor(model: string): number {
  const id = model.toLowerCase()
  if (id.includes('1m') || id.includes('-1000k') || id.includes('1000000')) return 1_000_000
  if (id.includes('gemini')) return 1_048_576
  if (id.includes('claude')) return 200_000
  if (id.includes('gpt-4.1') || id.includes('gpt-4o')) return 128_000
  if (id.includes('gpt-4')) return 128_000
  if (id.includes('deepseek')) return 128_000
  if (id.includes('qwen')) return 131_072
  if (id.includes('llama')) return 131_072
  if (id.includes('kimi')) return 200_000
  if (id.includes('glm')) return 200_000
  if (id.includes('mistral')) return 128_000
  if (id.includes('gemma')) return 32_768
  return 128_000
}
