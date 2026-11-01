import fs from 'node:fs'
import path from 'node:path'
import type {
  ApprovalAnswer,
  ApprovalScope,
  TreeEntry,
  TreeResult
} from '../../shared/types'
import { tr } from '../lang'
import { findEntry, skillNames } from '../library'
import { MAX_IMAGE_BYTES, sniffImageMime } from '../llm/images'
import type { MessageImage, ToolSchema } from '../llm/types'

const MAX_READ_BYTES = 512 * 1024
const MAX_READ_CHARS = 140_000
const MAX_LIST_ENTRIES = 250
const MAX_SEARCH_MATCHES = 60
const MAX_SEARCH_FILE_BYTES = 512 * 1024
const MAX_IMAGE_PROMPT_CHARS = 4_000
const IMAGE_SIZES = new Set(['1024x1024', '1024x1536', '1536x1024', '1024x1792', '1792x1024'])

const SKIPPED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'out',
  'build',
  'release',
  'coverage',
  '.next',
  '.turbo',
  '.cache',
  '__pycache__',
  '.venv',
  'venv',
  '.idea',
  '.vscode'
])

export const agentTools: ToolSchema[] = [
  {
    name: 'list_files',
    description:
      'List files and folders in a project directory. Use it to understand the structure before reading files. Folders end with a slash.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description:
            'Folder path. Relative to the project root, or absolute for a folder the user already granted access to. Defaults to the root.'
        },
        depth: {
          type: 'integer',
          description: 'How many folder levels to include, from 1 to 4. Defaults to 1.'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'read_file',
    description:
      'Read a UTF-8 text file. Always read a file before modifying it. Large or binary files are rejected.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path relative to the project root, or absolute outside it (asks the user).'
        }
      },
      required: ['path'],
      additionalProperties: false
    }
  },
  {
    name: 'search_files',
    description:
      'Search file contents in the project with a case-insensitive substring or regular expression. Returns matching lines with paths and line numbers.',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Substring or JavaScript regular expression to look for.'
        },
        glob: {
          type: 'string',
          description: 'Optional file name filter such as "*.ts" or "components/*.tsx".'
        },
        regex: {
          type: 'boolean',
          description: 'Treat pattern as a regular expression. Defaults to false.'
        }
      },
      required: ['pattern'],
      additionalProperties: false
    }
  },
  {
    name: 'write_file',
    description:
      'Create or overwrite a file with the given full content. The user reviews a diff and must approve the change before it is written. Prefer editing existing files over creating new ones.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path relative to the project root.'
        },
        content: {
          type: 'string',
          description: 'The complete new content of the file.'
        }
      },
      required: ['path', 'content'],
      additionalProperties: false
    }
  },
  {
    name: 'generate_image',
    description:
      'Generate a raster image from a text prompt with an image model. The image is generated first, then the user sees a preview and must approve saving it into the project. Use it when the user asks for a picture, logo, illustration, texture, avatar or photo.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description:
            'Detailed description of the image: subject, style, colors, composition and lighting.'
        },
        path: {
          type: 'string',
          description:
            'Where to save the image, relative to the project root. Defaults to images/<slug>-<time>.<ext>.'
        },
        model: {
          type: 'string',
          description:
            'Image model id from the configured image models. Defaults to the first one.'
        },
        size: {
          type: 'string',
          description:
            'Image size: 1024x1024, 1024x1536, 1536x1024, 1024x1792 or 1792x1024. Defaults to 1024x1024.'
        }
      },
      required: ['prompt'],
      additionalProperties: false
    }
  },
  {
    name: 'take_screenshot',
    description:
      'Capture the user screen and look at it. The picture is saved outside the project, shown to the user and attached to your next message, so you can read what is on screen: an app, an error, a layout. Use it when the user shows you their screen or asks you to check it.',
    parameters: {
      type: 'object',
      properties: {
        display: {
          type: 'integer',
          description: 'Which screen to capture, starting at 1. Defaults to 1 (the main screen).'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'use_skill',
    description:
      'Load the full instructions of a skill the user installed. Call it when a task matches a skill listed in the system prompt.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Skill name exactly as listed.' }
      },
      required: ['name'],
      additionalProperties: false
    }
  },
  {
    name: 'open_project',
    description:
      'Work in another project folder. Without arguments it lists the projects the user registered. With a project name, or an absolute path to an existing folder, it opens that project. The switch happens after your answer ends, so finish the current task first and tell the user you are switching.',
    parameters: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Registered project name, or absolute path of an existing folder. Omit to list the projects.'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'ask_user',
    description:
      'Ask the user one short question and wait for the answer. Use it when a missing decision or fact blocks the work and the project itself cannot answer it — a choice of library, a name format, which of two behaviors to keep. Offer up to four short answers the user can tap; the run pauses until the answer comes back as the tool result, so ask early instead of guessing.',
    parameters: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The question itself, one sentence, ending with a question mark.'
        },
        options: {
          type: 'array',
          items: { type: 'string' },
          description: 'Up to four short answers to tap. Keep each one under 40 characters.'
        },
        hint: {
          type: 'string',
          description: 'Optional one-line context: why you ask, or what you assume if unanswered.'
        }
      },
      required: ['question'],
      additionalProperties: false
    }
  },
  {
    name: 'run_subagent',
    description:
      'Delegate a self-contained subtask to one of the installed agents. The subagent can read, list and search but cannot write files. Use it for broad research that would otherwise fill your context.',
    parameters: {
      type: 'object',
      properties: {
        agent: { type: 'string', description: 'Agent name exactly as listed.' },
        task: {
          type: 'string',
          description: 'The whole subtask, including paths and what answer you need back.'
        }
      },
      required: ['agent', 'task'],
      additionalProperties: false
    }
  }
]

export const readOnlyToolNames = new Set(['list_files', 'read_file', 'search_files', 'use_skill'])

export interface QuestionInput {
  question: string
  options: string[]
  hint?: string
}

export interface ToolApprovalInput {
  scope: ApprovalScope
  path: string
  absolutePath: string
  oldContent: string | null
  newContent: string | null
  image?: { dataUrl: string; mime: string; bytes: number } | null
}

export interface ImageCapability {
  models: string[]
  generate: (input: {
    model: string
    prompt: string
    size: string | null
  }) => Promise<{ buffer: Buffer; mime: string }>
}

export interface ScreenShotResult {
  buffer: Buffer
  mime: string
  width: number
  height: number
  label: string
  displays: number
}

export interface ScreenCapability {
  capture: (display: number) => Promise<ScreenShotResult>
  save: (buffer: Buffer, display: number) => string
}

export interface ToolContext {
  root: string | null
  grantRootFor: (absolutePath: string) => string | null
  requestApproval: (input: ToolApprovalInput) => Promise<ApprovalAnswer>
  requestQuestion?: (question: QuestionInput) => Promise<string>
  grant: (absolutePath: string) => void
  allowWrite: boolean
  projectPath: string | null
  projects?: ProjectRef[]
  image?: ImageCapability
  screen?: ScreenCapability
  delegate?: (agent: string, task: string) => Promise<string>
}

export interface ProjectRef {
  name: string
  path: string
}

export interface ToolImage {
  path: string
  absolutePath: string
  mime: string
  bytes: number
}

export interface ToolEdit {
  path: string
  added: number
  removed: number
  kind: 'write' | 'image'
}

export interface ToolOutcome {
  ok: boolean
  content: string
  detail: string
  image?: ToolImage
  edit?: ToolEdit
  attach?: MessageImage[]
  projectSwitch?: string
}

function splitLines(text: string | null): string[] {
  if (text === null || text === undefined || text === '') return []
  const normalized = text.endsWith('\n') ? text.slice(0, -1) : text
  const cleaned = normalized.endsWith('\r') ? normalized.slice(0, -1) : normalized
  return cleaned.split(/\r?\n/)
}

export function diffStats(
  oldContent: string | null,
  newContent: string
): { added: number; removed: number } {
  const before = splitLines(oldContent)
  const after = splitLines(newContent)
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

function requireRoot(context: ToolContext): string {
  if (!context.root) throw new Error(tr('e.noProjectFolder'))
  return path.resolve(context.root)
}

function normalizeRelative(root: string, absolute: string): string {
  const rel = path.relative(root, absolute)
  return rel.split(path.sep).join('/') || '.'
}

function assertRealPathInside(bases: string[], target: string): void {
  if (!bases.length) return
  let probe = target
  while (!fs.existsSync(probe)) {
    const parent = path.dirname(probe)
    if (parent === probe) break
    probe = parent
  }
  let realProbe: string
  try {
    realProbe = fs.realpathSync(probe)
  } catch {
    return
  }
  const normProbe = process.platform === 'win32' ? realProbe.toLowerCase() : realProbe
  const escapes = bases.every((base) => {
    let realBase = base
    try {
      realBase = fs.realpathSync(base)
    } catch {
      realBase = base
    }
    const normBase = process.platform === 'win32' ? realBase.toLowerCase() : realBase
    const rel = path.relative(normBase, normProbe)
    return rel.startsWith('..') || path.isAbsolute(rel)
  })
  if (escapes) throw new Error(tr('e.noAccess'))
}

interface Located {
  absolute: string
  display: string
  outside: boolean
}

function locate(context: ToolContext, rawPath: unknown, scope: ApprovalScope): Located {
  const root = requireRoot(context)
  if (typeof rawPath !== 'string' || !rawPath.trim()) throw new Error(tr('e.pathRequired'))
  const candidate = rawPath.trim()
  const absolute = path.isAbsolute(candidate)
    ? path.resolve(candidate)
    : path.resolve(root, candidate)

  const relative = path.relative(root, absolute)
  const inside = relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative))

  if (!inside) {
    const granted = context.grantRootFor(absolute)
    if (!granted) throw new OutsideAccessError(absolute, scope)
    assertRealPathInside([granted], absolute)
    return { absolute, display: absolute, outside: true }
  }
  assertRealPathInside([root], absolute)
  return { absolute, display: normalizeRelative(root, absolute), outside: false }
}

class OutsideAccessError extends Error {
  constructor(readonly absolutePath: string, readonly scope: ApprovalScope) {
    super('outside')
    this.name = 'OutsideAccessError'
  }
}

async function resolveWithGrant(
  context: ToolContext,
  rawPath: unknown,
  scope: ApprovalScope
): Promise<Located> {
  try {
    return locate(context, rawPath, scope)
  } catch (error) {
    if (!(error instanceof OutsideAccessError)) throw error
    const root = requireRoot(context)
    const display = path.isAbsolute(rawPath as string)
      ? error.absolutePath
      : normalizeRelative(root, error.absolutePath)
    const answer = await context.requestApproval({
      scope: error.scope,
      path: display,
      absolutePath: error.absolutePath,
      oldContent: null,
      newContent: null
    })
    if (answer === 'deny') throw new Error(tr('e.noAccess'))
    if (answer === 'always') {
      let isDir = false
      try {
        isDir = fs.statSync(error.absolutePath).isDirectory()
      } catch {
        isDir = !path.extname(error.absolutePath)
      }
      context.grant(isDir ? error.absolutePath : path.dirname(error.absolutePath))
    }
    assertRealPathInside([error.absolutePath, path.dirname(error.absolutePath), root], error.absolutePath)
    return { absolute: error.absolutePath, display: error.absolutePath, outside: true }
  }
}

async function listFiles(
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolOutcome> {
  const start = await resolveWithGrant(
    context,
    typeof args.path === 'string' ? args.path : '.',
    'read-outside'
  )
  const rawDepth = Number(args.depth ?? 1)
  const depth = Number.isFinite(rawDepth) ? Math.min(4, Math.max(1, Math.trunc(rawDepth))) : 1

  let stat: fs.Stats
  try {
    stat = fs.statSync(start.absolute)
  } catch {
    throw new Error(tr('e.folderNotFound', { path: start.display }))
  }
  if (!stat.isDirectory()) throw new Error(tr('e.notAFolder', { path: start.display }))

  const entries: string[] = []
  let truncated = false

  const walk = (dir: string, prefix: string, remaining: number): void => {
    if (entries.length >= MAX_LIST_ENTRIES) {
      truncated = true
      return
    }
    let current: fs.Dirent[]
    try {
      current = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    current.sort((a, b) => {
      const dirDiff = Number(b.isDirectory()) - Number(a.isDirectory())
      return dirDiff !== 0 ? dirDiff : a.name.localeCompare(b.name)
    })
    for (const entry of current) {
      if (entries.length >= MAX_LIST_ENTRIES) {
        truncated = true
        return
      }
      if (entry.isSymbolicLink()) continue
      const isDir = entry.isDirectory()
      if (isDir && SKIPPED_DIRS.has(entry.name)) continue
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name
      entries.push(isDir ? `${rel}/` : rel)
      if (isDir && remaining > 1) walk(path.join(dir, entry.name), rel, remaining - 1)
    }
  }

  walk(start.absolute, start.display === '.' ? '' : start.display, depth)

  if (!entries.length) {
    return { ok: true, content: `(${start.display} is empty)`, detail: tr('d.emptyFolder') }
  }
  const listing = entries.join('\n')
  const suffix = truncated ? `\n[listing truncated at ${MAX_LIST_ENTRIES} entries]` : ''
  return {
    ok: true,
    content: `Files in ${start.display}:\n${listing}${suffix}`,
    detail: tr('d.listed', { n: entries.length }) + (truncated ? tr('d.truncated', { n: MAX_LIST_ENTRIES }) : '')
  }
}

const TREE_ENTRIES = 300

export function projectTree(root: string, relative: string | undefined): TreeResult {
  const base = path.resolve(root)
  const target = path.resolve(base, relative || '.')
  const fromRoot = path.relative(base, target)
  if (fromRoot.startsWith('..') || path.isAbsolute(fromRoot)) throw new Error(tr('e.noAccess'))

  let current: fs.Dirent[]
  try {
    current = fs.readdirSync(target, { withFileTypes: true })
  } catch {
    throw new Error(tr('e.folderNotFound', { path: relative || '.' }))
  }
  current.sort((a, b) => {
    const dirDiff = Number(b.isDirectory()) - Number(a.isDirectory())
    return dirDiff !== 0 ? dirDiff : a.name.localeCompare(b.name)
  })

  const prefix = fromRoot ? `${fromRoot.split(path.sep).join('/')}/` : ''
  const entries: TreeEntry[] = []
  let truncated = false
  for (const entry of current) {
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory() && SKIPPED_DIRS.has(entry.name)) continue
    if (entries.length >= TREE_ENTRIES) {
      truncated = true
      break
    }
    entries.push({ name: entry.name, path: `${prefix}${entry.name}`, dir: entry.isDirectory() })
  }
  return { path: prefix ? prefix.slice(0, -1) : '', entries, truncated }
}

function readFileSyncText(target: Located): { text: string; truncated: boolean } {
  const stat = fs.statSync(target.absolute)
  if (!stat.isFile()) throw new Error(tr('e.notAFile', { path: target.display }))
  if (stat.size > MAX_READ_BYTES) {
    throw new Error(tr('e.tooLargeRead', { n: Math.ceil(stat.size / 1024) }))
  }
  const buffer = fs.readFileSync(target.absolute)
  if (buffer.subarray(0, 4096).includes(0)) throw new Error(tr('e.binary'))
  const full = buffer.toString('utf8')
  if (full.length <= MAX_READ_CHARS) return { text: full, truncated: false }
  return { text: full.slice(0, MAX_READ_CHARS), truncated: true }
}

async function readFile(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
  const target = await resolveWithGrant(context, args.path, 'read-outside')
  try {
    if (!fs.existsSync(target.absolute)) {
      throw Object.assign(new Error(tr('e.notFound', { path: target.display })), { code: 'ENOENT' })
    }
    const { text, truncated } = readFileSyncText(target)
    return {
      ok: true,
      detail: tr('d.read', { path: target.display }),
      content: text.length
        ? `--- ${target.display} ---\n${text}${truncated ? '\n[... content truncated ...]' : ''}`
        : `--- ${target.display} ---\n(empty file)`
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ENOENT' || err.message === 'ENOENT' || err.message?.includes('not found')) {
      throw new Error(tr('e.notFound', { path: target.display }))
    }
    throw error
  }
}

function globToRegExp(glob: string): RegExp {
  const normalized = glob.replace(/\\/g, '/').replace(/^\/+/ , '')
  let pattern = ''
  let i = 0
  while (i < normalized.length) {
    if (normalized[i] === '*' && normalized[i + 1] === '*') {
      if (normalized[i + 2] === '/') {
        pattern += '(?:.+/)?'
        i += 3
        continue
      }
      pattern += '.*'
      i += 2
      continue
    }
    if (normalized[i] === '*') {
      pattern += '[^/]*'
      i++
      continue
    }
    if (normalized[i] === '?') {
      pattern += '[^/]'
      i++
      continue
    }
    if (['.', '+', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\'].includes(normalized[i])) {
      pattern += '\\' + normalized[i]
    } else {
      pattern += normalized[i]
    }
    i++
  }
  const hasSlash = glob.includes('/') || glob.includes('\\')
  return new RegExp(hasSlash ? `^${pattern}$` : `(^|/)${pattern}$`, 'i')
}

function walkFiles(root: string, limit: number): { path: string; relative: string }[] {
  const found: { path: string; relative: string }[] = []
  const stack: string[] = [root]
  while (stack.length && found.length < limit) {
    const dir = stack.pop() as string
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (found.length >= limit) break
      if (entry.isSymbolicLink()) continue
      const absolute = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (SKIPPED_DIRS.has(entry.name)) continue
        stack.push(absolute)
      } else if (entry.isFile()) {
        found.push({ path: absolute, relative: normalizeRelative(root, absolute) })
      }
    }
  }
  return found
}

function searchFiles(args: Record<string, unknown>, context: ToolContext): ToolOutcome {
  const root = requireRoot(context)
  const pattern = typeof args.pattern === 'string' ? args.pattern.trim() : ''
  if (!pattern) throw new Error(tr('e.badSearch'))
  const useRegex = args.regex === true
  const glob = typeof args.glob === 'string' && args.glob.trim() ? args.glob.trim() : null

  let test: (line: string) => boolean
  let label: string
  if (useRegex) {
    let re: RegExp
    try {
      re = new RegExp(pattern, 'i')
    } catch {
      re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    }
    test = (line) => re.test(line)
    label = `/${pattern}/`
  } else {
    const needle = pattern.toLowerCase()
    test = (line) => line.toLowerCase().includes(needle)
    label = pattern
  }

  const matcher = glob ? globToRegExp(glob) : null
  const files = walkFiles(root, 4000).filter(
    (file) => !matcher || matcher.test(file.relative.split(path.sep).join('/'))
  )

  const matches: string[] = []
  let scanned = 0
  for (const file of files) {
    if (matches.length >= MAX_SEARCH_MATCHES) break
    let stat: fs.Stats
    try {
      stat = fs.statSync(file.path)
    } catch {
      continue
    }
    if (stat.size > MAX_SEARCH_FILE_BYTES) continue
    let text: string
    try {
      const buffer = fs.readFileSync(file.path)
      if (buffer.subarray(0, 1024).includes(0)) continue
      text = buffer.toString('utf8')
    } catch {
      continue
    }
    scanned++
    const lines = text.split(/\r?\n/)
    for (let index = 0; index < lines.length; index++) {
      if (!test(lines[index])) continue
      matches.push(`${file.relative}:${index + 1}: ${lines[index].trim().slice(0, 240)}`)
      if (matches.length >= MAX_SEARCH_MATCHES) break
    }
    if (matches.length >= MAX_SEARCH_MATCHES) break
  }

  if (!matches.length) {
    return {
      ok: true,
      content: `No match for ${label} in ${scanned} text files.`,
      detail: tr('d.found', { n: 0 })
    }
  }
  return {
    ok: true,
    content: `Matches for ${label}:\n${matches.join('\n')}`,
    detail: tr('d.found', { n: matches.length })
  }
}

async function writeFile(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
  if (!context.allowWrite) {
    return {
      ok: false,
      content:
        'This run is read-only, so file writes are disabled. Describe the steps in your answer instead of editing files.',
      detail: tr('e.readOnly')
    }
  }
  let target: Located
  try {
    target = locate(context, args.path, 'write-outside')
  } catch (error) {
    if (!(error instanceof OutsideAccessError)) throw error
    target = { absolute: error.absolutePath, display: error.absolutePath, outside: true }
  }
  if (target.display === '.') throw new Error(tr('e.mustBeFile'))
  if (typeof args.content !== 'string') throw new Error(tr('e.badContent'))

  let oldContent: string | null = null
  try {
    const stat = fs.statSync(target.absolute)
    if (stat.isDirectory()) throw new Error(tr('e.notAFile', { path: target.display }))
    if (stat.size > MAX_READ_BYTES) throw new Error(tr('e.tooLargeEdit'))
    oldContent = fs.readFileSync(target.absolute, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }

  if (oldContent === args.content) {
    return {
      ok: true,
      content: `No changes were needed: ${target.display} already has this content.`,
      detail: tr('d.noChange', { path: target.display })
    }
  }

  const answer = await context.requestApproval({
    scope: target.outside ? 'write-outside' : 'write',
    path: target.display,
    absolutePath: target.absolute,
    oldContent,
    newContent: args.content
  })
  if (answer === 'deny') {
    return {
      ok: false,
      content:
        'The user rejected this file change. Do not retry the same edit. Explain what you wanted to change or ask the user how to proceed.',
      detail: tr('d.rejected', { path: target.display })
    }
  }
  if (answer === 'always' && target.outside) context.grant(path.dirname(target.absolute))

  const stats = diffStats(oldContent, args.content)
  fs.mkdirSync(path.dirname(target.absolute), { recursive: true })
  fs.writeFileSync(target.absolute, args.content, 'utf8')
  return {
    ok: true,
    content: `Wrote ${target.display} (${Buffer.byteLength(args.content, 'utf8')} bytes).`,
    detail: target.outside
      ? tr('d.wroteOutside', { path: target.display })
      : tr('d.wrote', { path: target.display }),
    edit: { path: target.display, added: stats.added, removed: stats.removed, kind: 'write' }
  }
}

function imageExtension(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  return 'png'
}

function slugForPrompt(prompt: string): string {
  const normalized = prompt.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const words = normalized
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
  return words.join('-').slice(0, 40) || 'image'
}

function normalizeImagePath(rawPath: string, mime: string): string {
  const ext = path.extname(rawPath).toLowerCase()
  const expected = imageExtension(mime)
  const known = ['.png', '.jpg', '.jpeg', '.webp', '.gif']
  if (!ext || !known.includes(ext)) return `${rawPath}.${expected}`
  if (ext === `.${expected}` || (expected === 'jpg' && ext === '.jpeg') || (expected === 'jpeg' && ext === '.jpg')) return rawPath
  return `${rawPath.slice(0, -ext.length)}.${expected}`
}

async function generateImageFile(
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolOutcome> {
  if (!context.allowWrite) {
    return {
      ok: false,
      content:
        'This run is read-only, so the image cannot be saved. Describe the visual idea and the path in your answer instead.',
      detail: tr('e.readOnly')
    }
  }
  if (!context.image || !context.image.models.length) {
    return {
      ok: false,
      content: 'Image generation is not available in this run.',
      detail: tr('e.imageUnavailable')
    }
  }

  const prompt = typeof args.prompt === 'string' ? args.prompt.trim() : ''
  if (!prompt) throw new Error(tr('e.imagePrompt'))
  if (prompt.length > MAX_IMAGE_PROMPT_CHARS) {
    throw new Error(tr('e.imagePromptLong', { n: MAX_IMAGE_PROMPT_CHARS }))
  }

  const models = context.image.models
  const requestedModel = typeof args.model === 'string' ? args.model.trim() : ''
  const model = requestedModel || models[0]
  if (!models.includes(model)) {
    return {
      ok: false,
      content: `Unknown image model "${requestedModel}". Available image models: ${models.join(', ')}.`,
      detail: tr('e.badImageModel', { name: requestedModel || '?' })
    }
  }

  const rawSize = typeof args.size === 'string' ? args.size.trim().toLowerCase() : ''
  if (rawSize && rawSize !== 'auto' && !IMAGE_SIZES.has(rawSize)) {
    throw new Error(tr('e.imageSize', { value: rawSize }))
  }
  const size = rawSize && rawSize !== 'auto' ? rawSize : null

  const generated = await context.image.generate({ model, prompt, size })
  if (generated.buffer.length > MAX_IMAGE_BYTES) throw new Error(tr('e.imageTooBig'))
  const mime = sniffImageMime(generated.buffer)
  if (!mime) throw new Error(tr('e.imageBadData'))

  const requestedPath =
    typeof args.path === 'string' && args.path.trim() ? args.path.trim() : ''
  if (requestedPath && /[\\/]$/.test(requestedPath)) throw new Error(tr('e.mustBeFile'))
  const rawPath = requestedPath
    ? normalizeImagePath(requestedPath, mime)
    : `images/${slugForPrompt(prompt)}-${Date.now().toString(36)}.${imageExtension(mime)}`

  let target: Located
  try {
    target = locate(context, rawPath, 'image-outside')
  } catch (error) {
    if (!(error instanceof OutsideAccessError)) throw error
    target = { absolute: error.absolutePath, display: error.absolutePath, outside: true }
  }
  if (target.display === '.') throw new Error(tr('e.mustBeFile'))

  try {
    if (fs.statSync(target.absolute).isDirectory()) {
      throw new Error(tr('e.notAFile', { path: target.display }))
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }

  const dataUrl = `data:${mime};base64,${generated.buffer.toString('base64')}`
  const answer = await context.requestApproval({
    scope: target.outside ? 'image-outside' : 'image',
    path: target.display,
    absolutePath: target.absolute,
    oldContent: null,
    newContent: null,
    image: { dataUrl, mime, bytes: generated.buffer.length }
  })
  if (answer === 'deny') {
    return {
      ok: false,
      content:
        'The user rejected saving this image. Do not retry the exact same image; ask what to change in the prompt or the path.',
      detail: tr('d.imageRejected', { path: target.display })
    }
  }
  if (answer === 'always' && target.outside) context.grant(path.dirname(target.absolute))

  fs.mkdirSync(path.dirname(target.absolute), { recursive: true })
  fs.writeFileSync(target.absolute, generated.buffer)
  const kb = Math.max(1, Math.round(generated.buffer.length / 1024))
  return {
    ok: true,
    content: `Generated an image with ${model} and saved it to ${target.display} (${kb} KB). The user can see it in the chat.`,
    detail: target.outside
      ? tr('d.imageSavedOutside', { path: target.display })
      : tr('d.imageSaved', { path: target.display }),
    image: {
      path: target.display,
      absolutePath: target.absolute,
      mime,
      bytes: generated.buffer.length
    },
    edit: { path: target.display, added: 1, removed: 0, kind: 'image' }
  }
}

async function takeScreenshot(
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolOutcome> {
  const capability = context.screen
  if (!capability) {
    return {
      ok: false,
      content: 'Screen capture is not available in this run.',
      detail: tr('e.screenUnavailable')
    }
  }
  const raw = Number(args.display ?? 1)
  const display = Number.isFinite(raw) ? (raw <= 0 ? 1 : Math.trunc(raw)) : 1
  const shot = await capability.capture(display)
  if (!shot.buffer.length) throw new Error(tr('e.noScreen'))
  if (shot.buffer.length > MAX_IMAGE_BYTES) throw new Error(tr('e.imageTooBig'))
  const mime = sniffImageMime(shot.buffer) ?? shot.mime
  const absolutePath = capability.save(shot.buffer, display)
  const kb = Math.max(1, Math.round(shot.buffer.length / 1024))
  return {
    ok: true,
    content: `Captured ${shot.label}: ${shot.width}x${shot.height}, ${kb} KB, kept in the CloseCode folder. The picture is attached below — read it before answering.`,
    detail: tr('d.screenshot', { width: shot.width, height: shot.height }),
    image: {
      path: path.basename(absolutePath),
      absolutePath,
      mime,
      bytes: shot.buffer.length
    },
    attach: [{ mime, data: shot.buffer.toString('base64') }]
  }
}

function useSkill(args: Record<string, unknown>, context: ToolContext): ToolOutcome {
  const name = typeof args.name === 'string' ? args.name.trim() : ''
  const entry = name ? findEntry('skill', name, context.projectPath) : null
  if (!entry) {
    const available = skillNames(context.projectPath)
    return {
      ok: false,
      content: available.length
        ? `Unknown skill "${name}". Installed skills: ${available.join(', ')}.`
        : `Unknown skill "${name}". No skills are installed.`,
      detail: tr('e.badSkillName', { name: name || '?' })
    }
  }
  return {
    ok: true,
    content: `--- skill: ${entry.name} ---\n${entry.body}`,
    detail: tr('d.skillLoaded', { name: entry.name })
  }
}

function sameFolder(a: string, b: string): boolean {
  const normalize = (value: string): string => {
    const resolved = path.resolve(value)
    const stripped = resolved.replace(/[\\/]+$/, '')
    const finalPath = stripped.endsWith(':') ? `${stripped}\\` : stripped
    return process.platform === 'win32' ? finalPath.toLowerCase() : finalPath
  }
  try {
    return normalize(a) === normalize(b)
  } catch {
    return false
  }
}

function isExistingFolder(target: string): boolean {
  try {
    return fs.statSync(target).isDirectory()
  } catch {
    return false
  }
}

async function openProject(
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolOutcome> {
  const projects = context.projects ?? []
  const wanted = typeof args.project === 'string' ? args.project.trim() : ''
  const current = context.root ? path.resolve(context.root) : ''

  if (!wanted) {
    if (!projects.length) {
      return {
        ok: false,
        content: 'No projects are registered. Ask the user to add a folder in the Projects panel.',
        detail: tr('e.noProjects')
      }
    }
    const listing = projects.map((project) =>
      current && sameFolder(project.path, current)
        ? `- ${project.name}: ${project.path} (already open)`
        : `- ${project.name}: ${project.path}`
    )
    return {
      ok: true,
      content: `Projects the user registered:\n${listing.join(
        '\n'
      )}\nCall open_project with one of these names to switch.`,
      detail: tr('d.listedProjects', { n: projects.length })
    }
  }

  const query = wanted.toLowerCase()
  const looksLikePath =
    path.isAbsolute(wanted) || /^[a-z]:[\\/]/i.test(wanted) || wanted.startsWith('\\\\')
  let target = ''

  if (looksLikePath) {
    target = path.resolve(wanted)
    if (!isExistingFolder(target)) {
      return {
        ok: false,
        content: `Folder not found: ${target}`,
        detail: tr('e.folderNotFound', { path: wanted })
      }
    }
  } else {
    const match =
      projects.find((project) => project.name.toLowerCase() === query) ??
      projects.find((project) => project.name.toLowerCase().includes(query))
    if (!match) {
      return {
        ok: false,
        content: projects.length
          ? `Unknown project "${wanted}". Registered projects: ${projects
              .map((project) => project.name)
              .join(', ')}.`
          : `Unknown project "${wanted}". No projects are registered yet.`,
        detail: tr('e.unknownProject', { name: wanted })
      }
    }
    target = path.resolve(match.path)
  }

  if (current && sameFolder(target, current)) {
    return {
      ok: true,
      content: `This project is already open: ${target}`,
      detail: tr('d.projectAlready')
    }
  }

  if (!projects.some((project) => sameFolder(project.path, target))) {
    const answer = await context.requestApproval({
      scope: 'read-outside',
      path: target,
      absolutePath: target,
      oldContent: null,
      newContent: null
    })
    if (answer === 'deny') {
      return {
        ok: false,
        content: 'The user did not allow opening that folder.',
        detail: tr('e.noAccess')
      }
    }
  }

  return {
    ok: true,
    content: `The app switches to ${target} as soon as this answer ends. Tell the user which project you opened.`,
    detail: tr('d.projectSwitch', { name: path.basename(target) }),
    projectSwitch: target
  }
}

const MAX_QUESTION_OPTIONS = 4
const MAX_QUESTION_CHARS = 600

async function askUser(
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolOutcome> {
  const rawQuestion = typeof args.question === 'string' ? args.question.trim() : ''
  if (!rawQuestion) {
    return { ok: false, content: 'ask_user needs a question.', detail: tr('e.noQuestion') }
  }
  if (!context.requestQuestion) {
    return { ok: false, content: 'This run cannot ask the user anything.', detail: tr('e.noAsk') }
  }
  const question = rawQuestion.slice(0, MAX_QUESTION_CHARS)
  const hint = typeof args.hint === 'string' ? args.hint.trim().slice(0, MAX_QUESTION_CHARS) : ''
  const raw = Array.isArray(args.options) ? args.options : []
  const options = [
    ...new Set(
      raw.map((option) => (typeof option === 'string' ? option.trim() : '')).filter(Boolean)
    )
  ].slice(0, MAX_QUESTION_OPTIONS)

  const answer = (
    await context.requestQuestion({
      question,
      options,
      hint: hint || undefined
    })
  ).trim()

  if (!answer) {
    return {
      ok: true,
      content:
        'The user skipped the question. Choose the most reasonable option yourself, state that assumption in your reply and keep working.',
      detail: tr('d.skipped')
    }
  }
  return {
    ok: true,
    content: `The user answered: "${answer}". Continue the task with this answer.`,
    detail: tr('d.answered', { answer: answer.length > 60 ? `${answer.slice(0, 60)}…` : answer })
  }
}

async function runSubagent(
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolOutcome> {
  const agent = typeof args.agent === 'string' ? args.agent.trim() : ''
  const task = typeof args.task === 'string' ? args.task.trim() : ''
  if (!task) throw new Error(tr('e.emptyTask'))
  if (!context.delegate) {
    return { ok: false, content: 'Subagents are not available in this run.', detail: tr('e.badAgentName', { name: agent || '?' }) }
  }
  const entry = agent ? findEntry('agent', agent, context.projectPath) : null
  if (!entry) {
    return {
      ok: false,
      content: `Unknown agent "${agent}".`,
      detail: tr('e.badAgentName', { name: agent || '?' })
    }
  }
  const report = await context.delegate(entry.name, task)
  return {
    ok: true,
    content: `--- ${entry.name} ---\n${report}`,
    detail: tr('d.agentDone', { name: entry.name })
  }
}

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolOutcome> {
  try {
    switch (name) {
      case 'list_files':
        return await listFiles(args, context)
      case 'read_file':
        return await readFile(args, context)
      case 'search_files':
        return searchFiles(args, context)
      case 'write_file':
        return await writeFile(args, context)
      case 'generate_image':
        return await generateImageFile(args, context)
      case 'take_screenshot':
        return await takeScreenshot(args, context)
      case 'use_skill':
        return useSkill(args, context)
      case 'open_project':
        return await openProject(args, context)
      case 'ask_user':
        return await askUser(args, context)
      case 'run_subagent':
        return await runSubagent(args, context)
      default:
        return {
          ok: false,
          content: `Unknown tool "${name}". Available tools: ${agentTools
            .map((tool) => tool.name)
            .join(', ')}.`,
          detail: `${tr('tool.unknown')}: ${name}`
        }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, content: `Tool error: ${message}`, detail: message }
  }
}
