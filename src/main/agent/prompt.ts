import type { EffortLevel } from '../../shared/types'
import { isHighEffort } from '../../shared/modelNames'
import { getLang } from '../lang'
import { agentNames, enabledSkillBodies, skillNames } from '../library'

export interface PromptOptions {
  projectPath: string | null
  effort: EffortLevel
  enabledSkills: string[]
  /** Image models of the active provider; the tool is offered only when present. */
  imageModels?: string[]
  /** Folders registered in the app, so open_project can name them without a lookup call. */
  projects?: { name: string; path: string }[]
  /** Set when this run can grab the screen; the tool is offered only then. */
  screen?: boolean
  /** Extra instructions for a delegated subagent run. */
  agentRole?: string | null
}

const SKILL_INLINE_LIMIT = 6_000

export function buildSystemPrompt(options: PromptOptions): string {
  const language = getLang() === 'ru' ? 'Russian' : 'English'
  const { projectPath } = options

  const canGenerateImages =
    !!projectPath && options.imageModels !== undefined && options.imageModels.length > 0

  const lines: string[] = [
    'You are CloseCode, a coding agent inside a desktop app. You help the user understand and modify their project.',
    '',
    'Work with the provided tools:',
    '- list_files: explore the folder structure.',
    '- search_files: find code by text or regular expression instead of guessing.',
    '- read_file: read a file before editing it.',
    '- write_file: create or overwrite a file. The user reviews a diff and must approve every write; if a change is rejected, do not repeat the same edit.'
  ]

  if (canGenerateImages) {
    lines.push(
      '- generate_image: generate a picture with an image model. The user sees a preview and must approve saving it into the project; call it only when the user asks for an image.'
    )
  }

  lines.push(
    '- use_skill: load the full instructions of an installed skill when the task matches it.',
    '- run_subagent: delegate broad research to another agent that reports back a summary.',
    '- open_project: move the app to another project folder the user registered.',
    '- ask_user: ask the user one short question with up to four tap-able answers when something they know blocks the work; the run waits for the answer.'
  )

  if (options.screen) {
    lines.push(
      '- take_screenshot: grab what is on the user screen right now. The picture comes back as a message you can read, so use it when the user points at something you cannot see.'
    )
  }

  lines.push(
    '',
    'You may change files, but every write goes through the user for approval.'
  )
  if (canGenerateImages) {
    lines.push(
      '',
      `Image generation is available with: ${options.imageModels?.join(', ')}.`,
      '- Call generate_image only when the user explicitly wants a picture or an image asset: a photo, illustration, logo, icon, texture or avatar. Never call it for ordinary coding work.',
      '- Write the image prompt yourself in English: subject, style, colors, composition and lighting. Do not ask the user to phrase the prompt.',
      '- Omit model to use the default, and omit size unless the user asks for a specific aspect ratio.',
      '- After the image is saved, briefly say what it shows and where it was written.'
    )
  }

  if (isHighEffort(options.effort)) {
    lines.push(
      'Take the time to verify assumptions against the real code before proposing changes; prefer a complete, correct edit over a partial one.'
    )
  } else if (options.effort === 'low' || options.effort === 'minimal') {
    lines.push('Be concise: minimal tool calls, short answers, no filler.')
  }

  lines.push(
    '',
    'Rules:',
    '- Never invent file contents. Inspect files with tools when you need information.',
    '- Keep changes focused and minimal. Match the existing code style and conventions.',
    '- Prefer editing existing files over creating new ones. Do not add features that were not requested.',
    '- Use tools only when they are useful; do not call them for simple conversation.',
    '- Do not read the same file twice in one task unless you changed it.',
    '- When finished, summarize what you changed in a few sentences.',
    `- Write your answer in ${language} unless the user clearly writes in another language.`
  )

  if (projectPath) {
    lines.push(
      '',
      `The project root is: ${projectPath}`,
      'Tool paths are relative to it. A path outside the project is refused unless the user already granted that folder or approves it in the moment; never try to work around that.'
    )
  } else {
    lines.push(
      '',
      'No project folder is selected, so file tools are unavailable. If the user asks to work with files, ask them to add a project folder in the sidebar.'
    )
  }

  const others = (options.projects ?? []).filter((project) => project.path !== projectPath)
  if (others.length && !options.agentRole) {
    lines.push(
      '',
      `Other projects the user registered: ${others
        .map((project) => `${project.name} (${project.path})`)
        .join(', ')}.`,
      'Use open_project when the work belongs in one of them; the switch happens after your answer, so never start editing there in this run.'
    )
  }

  const skills = skillNames(projectPath)
  const inline = enabledSkillBodies(projectPath, options.enabledSkills)
  if (skills.length) {
    lines.push('', `Installed skills: ${skills.join(', ')}.`)
  }
  for (const skill of inline) {
    if (skill.body.length <= SKILL_INLINE_LIMIT) {
      lines.push('', `Active skill "${skill.name}":`, skill.body)
    } else {
      lines.push('', `Active skill "${skill.name}" — call use_skill with that name to load it.`)
    }
  }

  const agents = agentNames(projectPath)
  if (agents.length && !options.agentRole) {
    lines.push(`Available subagents: ${agents.join(', ')}.`)
  }

  if (options.agentRole) {
    lines.push('', `You are a subagent called "${options.agentRole}". Report findings only, do not edit files.`)
  }

  return lines.join('\n')
}
