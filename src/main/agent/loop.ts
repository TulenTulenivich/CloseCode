import { randomUUID } from 'node:crypto'
import type {
  AgentEvent,
  ApprovalAnswer,
  ApprovalRequest,
  EffortLevel,
  ProviderKind,
  UserQuestion
} from '../../shared/types'
import { maxTokensFor, reasoningEffortFor, temperatureFor, thinkingBudgetFor } from '../../shared/modelNames'
import { abandonRequest, beginRequest } from '../load'
import type { ChatMessage, ProviderResult, ProviderStream, ToolSchema } from '../llm/types'
import { streamAnthropic } from '../llm/anthropic'
import { streamOpenAi } from '../llm/openai'
import { compactHistoryIfNeeded } from './context'
import { tr } from '../lang'
import { findEntry } from '../library'
import {
  agentTools,
  readOnlyToolNames,
  runTool,
  type ImageCapability,
  type ProjectRef,
  type QuestionInput,
  type ScreenCapability,
  type ToolContext
} from './tools'

export interface AgentRunOptions {
  provider: { kind: ProviderKind; apiKey: string; baseUrl: string; models?: string[] }
  model: string
  system: string
  messages: ChatMessage[]
  projectRoot: string | null
  signal: AbortSignal
  effort: EffortLevel
  emit: (event: AgentEvent) => void
  requestApproval: (request: ApprovalRequest) => Promise<ApprovalAnswer>
  /** Set for the main run: ask_user shows the question and waits for the answer. */
  requestQuestion?: (question: UserQuestion) => Promise<string>
  grantRootFor: (absolutePath: string) => string | null
  grant: (absolutePath: string) => void
  /** Present when the active provider lists at least one image model. */
  image?: ImageCapability
  /** Present for the main run of the desktop app: lets the agent look at the user screen. */
  screen?: ScreenCapability
  /** Projects the user registered, offered to the main run through open_project. */
  projects?: ProjectRef[]
  onProjectSwitch?: (absolutePath: string) => void
  onProgress?: () => void
  /** Every assistant turn of the main run, recorded before a mid-run compaction can drop it. */
  onAssistantTurn?: (message: ChatMessage) => void
  /** Fraction of the window where the run compacts itself and keeps going. */
  compactThreshold?: number
  /** Set for delegated runs: the tool-call id the sub-output belongs to. */
  parentCallId?: string | null
  agentName?: string | null
  depth?: number
}

const MAX_ROUNDS = 32
const SUBAGENT_MAX_ROUNDS = 8
const SUBAGENT_REPORT_CHARS = 12_000

function abortError(): Error {
  const error = new Error('Aborted')
  error.name = 'AbortError'
  return error
}

const OVERFLOW_HINT =
  /(maximum context|context (length|window)|prompt is too long|too many tokens|token limit|input is too (long|large)|request entity too large|\b413\b)/i

const MAX_OVERFLOW_RETRIES = 3

function isContextOverflow(error: unknown): boolean {
  return OVERFLOW_HINT.test(
    `${(error as Error)?.name ?? ''} ${(error as Error)?.message ?? ''}`
  )
}

/** Summary pass over the live message array; the run continues on the compacted transcript. */
function makeRoom(
  options: AgentRunOptions,
  messages: ChatMessage[],
  system: string,
  emit: (event: AgentEvent) => void,
  force: boolean
): Promise<void> {
  return compactHistoryIfNeeded({
    messages,
    system,
    provider: options.provider,
    model: options.model,
    signal: options.signal,
    emit,
    source: 'auto',
    effort: options.effort,
    threshold: options.compactThreshold,
    force
  }).then(() => undefined)
}

function toolsFor(options: AgentRunOptions): ToolSchema[] {
  const readOnly = (options.depth ?? 0) > 0
  const names = new Set<string>(
    readOnly ? [...readOnlyToolNames, 'run_subagent'] : agentTools.map((tool) => tool.name)
  )
  if ((options.depth ?? 0) > 0) names.delete('run_subagent')
  if (!options.image?.models.length) names.delete('generate_image')
  if (!options.screen) names.delete('take_screenshot')
  if (!options.requestQuestion) names.delete('ask_user')
  return agentTools.filter((tool) => names.has(tool.name))
}

/** Only the run the user talks to can ask back; every question carries an id to answer by. */
function askerFor(
  options: AgentRunOptions
): ((question: QuestionInput) => Promise<string>) | undefined {
  const ask = options.requestQuestion
  if (!ask || (options.depth ?? 0) > 0) return undefined
  return async (input) => await ask({ id: randomUUID(), ...input })
}

async function delegate(
  options: AgentRunOptions,
  entry: { name: string; body: string; model: string | null },
  task: string,
  callId: string
): Promise<string> {
  const messages: ChatMessage[] = [{ role: 'user', content: task }]
  const emit: (event: AgentEvent) => void = (event) => {
    if (event.type === 'text-delta') return
    if (event.type === 'tool-start') {
      options.emit({ ...event, parent: callId, agent: entry.name })
      return
    }
    if (event.type === 'tool-end') {
      options.emit({ ...event, parent: callId })
      return
    }
    options.emit(event)
  }

  const subModel =
    entry.model && options.provider.models?.includes(entry.model) ? entry.model : options.model
  const sub: AgentRunOptions = {
    ...options,
    model: subModel,
    system: `${options.system}\n\n${entry.body}`.slice(0, 40_000),
    messages,
    parentCallId: callId,
    agentName: entry.name,
    depth: (options.depth ?? 0) + 1,
    emit
  }

  let report = ''
  let overflowRetries = 0
  for (let round = 0; round < SUBAGENT_MAX_ROUNDS; round++) {
    if (options.signal.aborted) throw abortError()
    await makeRoom(sub, messages, sub.system, emit, false)
    const stream: ProviderStream =
      options.provider.kind === 'anthropic' ? streamAnthropic : streamOpenAi
    const trace = beginRequest(sub.model)
    let outcome: ProviderResult
    try {
      outcome = await stream(
        {
          apiKey: options.provider.apiKey,
          baseUrl: options.provider.baseUrl,
          model: sub.model,
          system: sub.system,
          messages,
          tools: toolsFor(sub),
          signal: options.signal,
          maxTokens: maxTokensFor(options.effort),
          temperature: temperatureFor(options.effort),
          reasoningEffort: reasoningEffortFor(sub.model, options.effort),
          thinkingBudget: thinkingBudgetFor(sub.model, options.effort)
        },
        (text) => {
          trace.firstToken()
          trace.delta(text)
        }
      )
      trace.done()
    } catch (error) {
      abandonRequest(trace.id)
      trace.done()
      if (
        !isContextOverflow(error) ||
        overflowRetries >= MAX_OVERFLOW_RETRIES ||
        options.signal.aborted
      ) {
        throw error
      }
      overflowRetries++
      await makeRoom(sub, messages, sub.system, emit, true)
      continue
    }

    messages.push({ role: 'assistant', content: outcome.text, toolCalls: outcome.toolCalls })
    report = outcome.text.trim() || report
    if (!outcome.toolCalls.length) break

    for (const call of outcome.toolCalls) {
      if (options.signal.aborted) throw abortError()
      let args: Record<string, unknown> = {}
      try {
        const parsed = JSON.parse(call.arguments || '{}') as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          args = parsed as Record<string, unknown>
        }
      } catch {
        args = {}
      }
      emit({ type: 'tool-start', id: call.id, name: call.name, args })
      const result = await runTool(call.name, args, contextFor(sub))
      messages.push({ role: 'tool', toolCallId: call.id, content: result.content })
      emit({ type: 'tool-end', id: call.id, ok: result.ok, detail: result.detail })
    }
  }

  return report.slice(0, SUBAGENT_REPORT_CHARS) || '(no findings)'
}

function contextFor(options: AgentRunOptions): ToolContext {
  return {
    root: options.projectRoot,
    projectPath: options.projectRoot,
    allowWrite: false,
    grantRootFor: options.grantRootFor,
    grant: options.grant,
    requestApproval: async (input) => {
      const request: ApprovalRequest = { id: randomUUID(), ...input }
      return options.requestApproval(request)
    }
  }
}

export async function runAgent(options: AgentRunOptions): Promise<void> {
  const stream: ProviderStream =
    options.provider.kind === 'anthropic' ? streamAnthropic : streamOpenAi
  const { signal } = options
  let overflowRetries = 0

  for (let round = 0; round < MAX_ROUNDS; round++) {
    if (signal.aborted) throw abortError()
    await makeRoom(options, options.messages, options.system, options.emit, false)

    options.emit({ type: 'assistant-start' })
    const trace = beginRequest(options.model)
    let result: ProviderResult
    try {
      result = await stream(
        {
          apiKey: options.provider.apiKey,
          baseUrl: options.provider.baseUrl,
          model: options.model,
          system: options.system,
          messages: options.messages,
          tools: toolsFor(options),
          signal,
          maxTokens: maxTokensFor(options.effort),
          temperature: temperatureFor(options.effort),
          reasoningEffort: reasoningEffortFor(options.model, options.effort),
          thinkingBudget: thinkingBudgetFor(options.model, options.effort)
        },
        (text) => {
          trace.firstToken()
          trace.delta(text)
          options.emit({ type: 'text-delta', text })
        }
      )
      trace.done()
    } catch (error) {
      abandonRequest(trace.id)
      trace.done()
      if (!isContextOverflow(error) || overflowRetries >= MAX_OVERFLOW_RETRIES || signal.aborted) {
        throw error
      }
      overflowRetries++
      await makeRoom(options, options.messages, options.system, options.emit, true)
      continue
    }

    const turn: ChatMessage = {
      role: 'assistant',
      content: result.text,
      toolCalls: result.toolCalls
    }
    options.messages.push(turn)
    options.onAssistantTurn?.(turn)
    options.onProgress?.()

    if (!result.toolCalls.length) return

    for (const call of result.toolCalls) {
      if (signal.aborted) throw abortError()

      let args: Record<string, unknown> = {}
      let invalidArgs = false
      try {
        const parsed = JSON.parse(call.arguments || '{}') as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          args = parsed as Record<string, unknown>
        } else {
          invalidArgs = true
        }
      } catch {
        invalidArgs = true
      }

      options.emit({
        type: 'tool-start',
        id: call.id,
        name: call.name,
        args,
        parent: options.parentCallId ?? null,
        agent: options.agentName ?? null
      })

      const outcome = invalidArgs
        ? { ok: false, content: 'Invalid tool arguments: expected a JSON object.', detail: tr('e.badSettings') }
        : await runTool(call.name, args, {
            root: options.projectRoot,
            projectPath: options.projectRoot,
            allowWrite: (options.depth ?? 0) === 0,
            image: options.image,
            screen: options.screen,
            projects: options.projects,
            grantRootFor: options.grantRootFor,
            grant: options.grant,
            requestApproval: async (input) => {
              const request: ApprovalRequest = { id: randomUUID(), ...input }
              return options.requestApproval(request)
            },
            // A subagent reports to its parent, not to the user, so only the top run may ask.
            requestQuestion: askerFor(options),
            delegate: async (agentName, task) => {
              const entry = findEntry('agent', agentName, options.projectRoot)
              if (!entry) throw new Error(tr('e.badAgentName', { name: agentName }))
              return await delegate(
                { ...options, messages: options.messages },
                { name: entry.name, body: entry.body, model: entry.model },
                task,
                call.id
              )
            }
          })

      options.messages.push({
        role: 'tool',
        toolCallId: call.id,
        content: outcome.content
      })
      if (outcome.attach?.length) {
        // Providers only accept pictures on user turns, so the image follows the tool result.
        options.messages.push({
          role: 'user',
          content: 'The picture the tool captured is attached to this message.',
          images: outcome.attach
        })
      }
      options.emit({
        type: 'tool-end',
        id: call.id,
        ok: outcome.ok,
        detail: outcome.detail,
        parent: options.parentCallId ?? null
      })
      if (outcome.image) {
        options.emit({
          type: 'image',
          id: call.id,
          path: outcome.image.path,
          absolutePath: outcome.image.absolutePath,
          mime: outcome.image.mime,
          bytes: outcome.image.bytes
        })
      }
      if (outcome.edit) {
        options.emit({ type: 'edit', id: call.id, ...outcome.edit })
      }
      if (outcome.projectSwitch) options.onProjectSwitch?.(outcome.projectSwitch)
      options.onProgress?.()

      if (signal.aborted) throw abortError()
    }
  }

  throw new Error(tr('e.stepLimit'))
}
