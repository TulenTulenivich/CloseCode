import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import type { AgentInfo, SkillInfo } from '../shared/types'

const MAX_SKILL_CHARS = 24_000

export interface LibraryEntry {
  kind: 'skill' | 'agent'
  id: string
  name: string
  description: string
  model: string | null
  source: 'global' | 'project'
  body: string
}

function globalSkillsDir(): string {
  return path.join(app.getPath('userData'), 'skills')
}

function globalAgentsDir(): string {
  return path.join(app.getPath('userData'), 'agents')
}

function projectDir(projectPath: string | null, kind: 'skills' | 'agents'): string | null {
  if (!projectPath) return null
  return path.join(projectPath, '.closecode', kind)
}

function ensureDir(dir: string): void {
  try {
    fs.mkdirSync(dir, { recursive: true })
  } catch {
    // unreadable userData folder — the list simply stays empty
  }
}

/** Minimal `key: value` front matter reader — enough for name/description/model. */
function parseFrontMatter(text: string): { meta: Record<string, string>; body: string } {
  const normalized = text.replace(/^\uFEFF/, '')
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(normalized)
  const meta: Record<string, string> = {}
  if (!match) return { meta, body: normalized.trim() }
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line.trim())
    if (!pair) continue
    meta[pair[1].toLowerCase()] = pair[2].trim().replace(/^["']|["']$/g, '')
  }
  return { meta, body: normalized.slice(match[0].length).trim() }
}

function readSkillDir(dir: string, source: 'global' | 'project'): LibraryEntry | null {
  for (const file of ['SKILL.md', 'skill.md', 'Skill.md']) {
    const candidate = path.join(dir, file)
    try {
      if (!fs.statSync(candidate).isFile()) continue
      const raw = fs.readFileSync(candidate, 'utf8')
      if (raw.length > MAX_SKILL_CHARS * 2) continue
      const name = path.basename(dir).slice(0, 48)
      const { meta, body } = parseFrontMatter(raw)
      return {
        kind: 'skill',
        id: `${source === 'global' ? 'g' : 'p'}:${name}`,
        name: meta.name?.slice(0, 60) || name,
        description: (meta.description || body.split(/\r?\n/)[0] || '').slice(0, 220),
        model: meta.model?.slice(0, 80) ?? null,
        source,
        body: raw.slice(0, MAX_SKILL_CHARS)
      }
    } catch {
      continue
    }
  }
  return null
}

function readAgentFile(file: string, source: 'global' | 'project'): LibraryEntry | null {
  try {
    const raw = fs.readFileSync(file, 'utf8')
    const name = path.basename(file).replace(/\.(md|markdown)$/i, '').slice(0, 48)
    const { meta, body } = parseFrontMatter(raw)
    return {
      kind: 'agent',
      id: `${source === 'global' ? 'g' : 'p'}:${name}`,
      name: meta.name?.slice(0, 60) || name,
      description: (meta.description || body.split(/\r?\n/)[0] || '').slice(0, 220),
      model: meta.model?.slice(0, 80) ?? null,
      source,
      body: raw.slice(0, MAX_SKILL_CHARS)
    }
  } catch {
    return null
  }
}

function collectSkills(projectPath: string | null): LibraryEntry[] {
  const found: LibraryEntry[] = []
  const seen = new Set<string>()
  const dirs: { dir: string; source: 'global' | 'project' }[] = [
    { dir: globalSkillsDir(), source: 'global' }
  ]
  const project = projectDir(projectPath, 'skills')
  if (project) dirs.push({ dir: project, source: 'project' })

  for (const { dir, source } of dirs) {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const skill = readSkillDir(path.join(dir, entry.name), source)
      if (!skill || seen.has(skill.name.toLowerCase())) continue
      seen.add(skill.name.toLowerCase())
      found.push(skill)
    }
  }
  return found
}

function collectAgents(projectPath: string | null): LibraryEntry[] {
  const found: LibraryEntry[] = []
  const seen = new Set<string>()
  const dirs: { dir: string; source: 'global' | 'project' }[] = [
    { dir: globalAgentsDir(), source: 'global' }
  ]
  const project = projectDir(projectPath, 'agents')
  if (project) dirs.push({ dir: project, source: 'project' })

  for (const { dir, source } of dirs) {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (!entry.isFile() || !/\.(md|markdown)$/i.test(entry.name)) continue
      const agent = readAgentFile(path.join(dir, entry.name), source)
      if (!agent || seen.has(agent.name.toLowerCase())) continue
      seen.add(agent.name.toLowerCase())
      found.push(agent)
    }
  }
  return found
}

export function listSkills(projectPath: string | null, enabledIds: string[]): SkillInfo[] {
  ensureDir(globalSkillsDir())
  return collectSkills(projectPath)
    .map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      source: skill.source,
      enabled: enabledIds.includes(skill.id),
      chars: skill.body.length
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function listAgents(projectPath: string | null): AgentInfo[] {
  ensureDir(globalAgentsDir())
  return collectAgents(projectPath)
    .map((agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      model: agent.model,
      source: agent.source
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function enabledSkillBodies(
  projectPath: string | null,
  enabledIds: string[]
): { name: string; body: string }[] {
  if (!enabledIds.length) return []
  return collectSkills(projectPath)
    .filter((skill) => enabledIds.includes(skill.id))
    .map((skill) => ({ name: skill.name, body: skill.body }))
}

/** Body of a single skill or agent, looked up by display name (project wins). */
export function findEntry(
  kind: 'skill' | 'agent',
  name: string,
  projectPath: string | null
): LibraryEntry | null {
  const wanted = name.trim().toLowerCase()
  const all = kind === 'skill' ? collectSkills(projectPath) : collectAgents(projectPath)
  return (
    all.find((entry) => entry.source === 'project' && entry.name.toLowerCase() === wanted) ??
    all.find((entry) => entry.name.toLowerCase() === wanted) ??
    null
  )
}

export function skillNames(projectPath: string | null): string[] {
  return collectSkills(projectPath).map((entry) => entry.name)
}

export function agentNames(projectPath: string | null): string[] {
  return collectAgents(projectPath).map((entry) => entry.name)
}

export function openLibraryDir(kind: 'skills' | 'agents'): string {
  const dir = kind === 'skills' ? globalSkillsDir() : globalAgentsDir()
  ensureDir(dir)
  return dir
}
