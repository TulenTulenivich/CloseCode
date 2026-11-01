import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import type { AgentEvent, ApprovalRequest } from '../src/shared/types'
import { runAgent } from '../src/main/agent/loop'
import type { ToolApprovalInput } from '../src/main/agent/tools'
import { runTool } from '../src/main/agent/tools'
import {
  compactHistoryIfNeeded,
  contextLimitForModel,
  estimateHistoryTokens
} from '../src/main/agent/context'
import type { ChatMessage } from '../src/main/llm/types'
import { streamOpenAi } from '../src/main/llm/openai'

interface CapturedRequest {
  url: string
  headers: http.IncomingHttpHeaders
  body: Record<string, unknown>
}

const sseHeaders = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive'
}

const SUMMARY_MARKER = 'You compress the history of a coding agent conversation'

function openAiSend(res: http.ServerResponse, payload: unknown): void {
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

function anthropicSend(res: http.ServerResponse, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

function openAiToolCall(res: http.ServerResponse, fileName: string): void {
  openAiSend(res, { choices: [{ delta: { role: 'assistant', content: 'Создаю файл. ' } }] })
  openAiSend(res, {
    choices: [
      {
        delta: {
          tool_calls: [
            {
              index: 0,
              id: 'call_test_1',
              type: 'function',
              function: { name: 'write_file', arguments: '' }
            }
          ]
        }
      }
    ]
  })
  const args = JSON.stringify({ path: fileName, content: 'Hello from CloseCode!\n' })
  openAiSend(res, {
    choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: args.slice(0, 12) } }] } }]
  })
  openAiSend(res, {
    choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: args.slice(12) } }] } }]
  })
  openAiSend(res, { choices: [{ delta: {}, finish_reason: 'tool_calls' }] })
  res.write('data: [DONE]\n\n')
}

function openAiNamedToolCall(
  res: http.ServerResponse,
  name: string,
  args: Record<string, unknown>
): void {
  openAiSend(res, {
    choices: [
      {
        delta: {
          role: 'assistant',
          tool_calls: [
            {
              index: 0,
              id: 'call_project_1',
              type: 'function',
              function: { name, arguments: JSON.stringify(args) }
            }
          ]
        }
      }
    ]
  })
  openAiSend(res, { choices: [{ delta: {}, finish_reason: 'tool_calls' }] })
  res.write('data: [DONE]\n\n')
}

function openAiText(res: http.ServerResponse, text: string): void {
  for (const piece of [text.slice(0, 6), text.slice(6, 16), text.slice(16)]) {
    if (piece) openAiSend(res, { choices: [{ delta: { content: piece } }] })
  }
  openAiSend(res, { choices: [{ delta: {}, finish_reason: 'stop' }] })
  res.write('data: [DONE]\n\n')
}

const REASONING_ONLY_TEXT = 'Сначала проверяю требование, потом ищу риски в коде.'

function openAiReasoningOnly(res: http.ServerResponse): void {
  openAiSend(res, {
    choices: [{ delta: { role: 'assistant', reasoning: REASONING_ONLY_TEXT.slice(0, 20) } }]
  })
  openAiSend(res, {
    choices: [
      {
        delta: {
          reasoning: { id: 'rs_1', type: 'reasoning.encrypted', data: 'x' },
          reasoning_details: [{ type: 'reasoning.text', text: REASONING_ONLY_TEXT.slice(20) }]
        }
      }
    ]
  })
  openAiSend(res, { choices: [{ delta: {}, finish_reason: 'length' }] })
  res.write('data: [DONE]\n\n')
}

function anthropicToolCall(res: http.ServerResponse): void {
  anthropicSend(res, 'message_start', {
    type: 'message_start',
    message: { id: 'msg_test_1', type: 'message', role: 'assistant', content: [] }
  })
  anthropicSend(res, 'content_block_start', {
    type: 'content_block_start',
    index: 0,
    content_block: { type: 'text', text: '' }
  })
  anthropicSend(res, 'content_block_delta', {
    type: 'content_block_delta',
    index: 0,
    delta: { type: 'text_delta', text: 'Записываю. ' }
  })
  anthropicSend(res, 'content_block_stop', { type: 'content_block_stop', index: 0 })
  anthropicSend(res, 'content_block_start', {
    type: 'content_block_start',
    index: 1,
    content_block: { type: 'tool_use', id: 'toolu_test_1', name: 'write_file', input: {} }
  })
  const args = JSON.stringify({ path: 'claude.txt', content: 'Hello from Claude\n' })
  anthropicSend(res, 'content_block_delta', {
    type: 'content_block_delta',
    index: 1,
    delta: { type: 'input_json_delta', partial_json: args.slice(0, 15) }
  })
  anthropicSend(res, 'content_block_delta', {
    type: 'content_block_delta',
    index: 1,
    delta: { type: 'input_json_delta', partial_json: args.slice(15) }
  })
  anthropicSend(res, 'content_block_stop', { type: 'content_block_stop', index: 1 })
  anthropicSend(res, 'message_delta', {
    type: 'message_delta',
    delta: { stop_reason: 'tool_use' },
    usage: { output_tokens: 12 }
  })
  anthropicSend(res, 'message_stop', { type: 'message_stop' })
}

function anthropicText(res: http.ServerResponse): void {
  anthropicSend(res, 'message_start', {
    type: 'message_start',
    message: { id: 'msg_test_2', type: 'message', role: 'assistant', content: [] }
  })
  anthropicSend(res, 'content_block_start', {
    type: 'content_block_start',
    index: 0,
    content_block: { type: 'text', text: '' }
  })
  anthropicSend(res, 'content_block_delta', {
    type: 'content_block_delta',
    index: 0,
    delta: { type: 'text_delta', text: 'Claude записал файл. Готово!' }
  })
  anthropicSend(res, 'content_block_stop', { type: 'content_block_stop', index: 0 })
  anthropicSend(res, 'message_delta', {
    type: 'message_delta',
    delta: { stop_reason: 'end_turn' },
    usage: { output_tokens: 8 }
  })
  anthropicSend(res, 'message_stop', { type: 'message_stop' })
}

async function main(): Promise<void> {
  const requests: CapturedRequest[] = []
  let overflowAttempts = 0
  const server = http.createServer(async (req, res) => {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as Record<string, unknown>
    requests.push({ url: req.url ?? '', headers: req.headers, body })

    if (req.method !== 'POST') {
      res.writeHead(404).end()
      return
    }

    if (req.url === '/v1/chat/completions') {
      const messages = (body.messages ?? []) as Array<{ role: string; content: unknown }>
      if (body.model === 'reasoning-only') {
        res.writeHead(200, sseHeaders)
        openAiReasoningOnly(res)
        res.end()
        return
      }
      const isSummary =
        !body.tools &&
        messages.some((message) => String(message.content ?? '').includes(SUMMARY_MARKER))
      if (isSummary) {
        res.writeHead(200, sseHeaders)
        openAiText(res, 'Ключевые факты: пользователь работал с hello.txt, файл создан.')
        res.end()
        return
      }
      const hasToolResult = messages.some((message) => message.role === 'tool')
      if (body.model === 'project-model') {
        res.writeHead(200, sseHeaders)
        if (!hasToolResult) openAiNamedToolCall(res, 'open_project', { project: 'Other' })
        else openAiText(res, 'Открываю проект Other.')
        res.end()
        return
      }
      if (body.model === 'ask-model') {
        const toolTurn = messages.find((message) => message.role === 'tool')
        res.writeHead(200, sseHeaders)
        if (!hasToolResult) {
          openAiNamedToolCall(res, 'ask_user', {
            question: 'Какой фреймворк использовать?',
            options: ['React', 'Vue']
          })
        } else {
          openAiText(res, `Выбор пользователя: ${String(toolTurn?.content ?? '')}`)
        }
        res.end()
        return
      }
      if (body.model === 'screen-model') {
        res.writeHead(200, sseHeaders)
        if (!hasToolResult) openAiNamedToolCall(res, 'take_screenshot', { display: 1 })
        else openAiText(res, 'Вижу экран.')
        res.end()
        return
      }
      if (body.model === 'overflow-model') {
        overflowAttempts++
        res.writeHead(200, sseHeaders)
        if (overflowAttempts === 1) {
          openAiSend(res, {
            error: {
              message: "This model's maximum context length is 8000 tokens. Your messages resulted in 12000 tokens."
            }
          })
        } else {
          openAiText(res, 'После принудительного сжатия контекста работа продолжилась.')
        }
        res.end()
        return
      }
      res.writeHead(200, sseHeaders)
      if (!hasToolResult) {
        const userText = messages
          .filter((message) => message.role === 'user')
          .map((message) => String(message.content))
          .join(' ')
        openAiToolCall(res, userText.includes('reject') ? 'reject.txt' : 'hello.txt')
      } else {
        openAiText(res, 'Файл обработан. Готово!')
      }
      res.end()
      return
    }

    if (req.url === '/v1/messages') {
      const messages = (body.messages ?? []) as Array<{ role: string; content: unknown }>
      const hasToolResult = JSON.stringify(messages).includes('tool_result')
      res.writeHead(200, sseHeaders)
      if (!hasToolResult) anthropicToolCall(res)
      else anthropicText(res)
      res.end()
      return
    }

    res.writeHead(404).end()
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as AddressInfo).port
  const baseUrl = `http://127.0.0.1:${port}/v1`
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'closecode-smoke-'))
  const project = path.join(workspace, 'project')
  fs.mkdirSync(project, { recursive: true })
  fs.mkdirSync(path.join(project, 'node_modules'), { recursive: true })
  fs.writeFileSync(path.join(project, 'node_modules', 'hidden.js'), 'hidden')
  fs.mkdirSync(path.join(project, 'src'), { recursive: true })
  fs.writeFileSync(path.join(project, 'src', 'index.ts'), 'export {}\n')

  const grants = {
    grantRootFor: () => null,
    grant: () => undefined
  }
  const runOpts = {
    effort: 'medium' as const,
    ...grants
  }
  const toolCtx = { root: project, ...grants, allowWrite: true, projectPath: project }
  fs.writeFileSync(path.join(workspace, 'secret.txt'), 'TOP SECRET')

  const controller = new AbortController()

  try {
    const events: AgentEvent[] = []
    const approvals: ApprovalRequest[] = []
    const messages: ChatMessage[] = [{ role: 'user', content: 'Создай hello.txt (approve)' }]

    await runAgent({
      provider: { kind: 'openai', apiKey: 'test-key', baseUrl },
      model: 'mock-model',
      system: 'You are a test agent.',
      messages,
      projectRoot: project,
      signal: controller.signal,
      emit: (event) => events.push(event),
      ...runOpts,
      requestApproval: async (request) => {
        approvals.push(request)
        return 'once' as const
      }
    })

    assert.equal(approvals.length, 1, 'one approval was requested')
    assert.equal(approvals[0].path, 'hello.txt')
    assert.equal(approvals[0].oldContent, null)
    assert.equal(approvals[0].newContent, 'Hello from CloseCode!\n')
    assert.equal(
      fs.readFileSync(path.join(project, 'hello.txt'), 'utf8'),
      'Hello from CloseCode!\n',
      'file written after approval'
    )

    const streamedText = events
      .filter((event): event is Extract<AgentEvent, { type: 'text-delta' }> => event.type === 'text-delta')
      .map((event) => event.text)
      .join('')
    assert.match(streamedText, /Создаю файл\./, 'assistant text from the first round is streamed')
    assert.match(streamedText, /Готово!/, 'assistant text from the second round is streamed')

    const toolStart = events.find(
      (event): event is Extract<AgentEvent, { type: 'tool-start' }> => event.type === 'tool-start'
    )
    assert.ok(toolStart, 'tool-start emitted')
    assert.equal(toolStart?.name, 'write_file')
    const toolEnd = events.find(
      (event): event is Extract<AgentEvent, { type: 'tool-end' }> => event.type === 'tool-end'
    )
    assert.ok(toolEnd?.ok, 'tool-end reports success')

    const openAiRequests = requests.filter((request) => request.url === '/v1/chat/completions')
    assert.equal(openAiRequests.length, 2, 'agent made two OpenAI requests')
    assert.equal(openAiRequests[0].headers.authorization, 'Bearer test-key')
    assert.ok(Array.isArray(openAiRequests[0].body.tools), 'tools are sent')
    assert.equal(openAiRequests[0].body.stream, true)
    const secondMessages = openAiRequests[1].body.messages as Array<{ role: string; content: string }>
    assert.ok(
      secondMessages.some((message) => message.role === 'tool' && message.content.includes('Wrote hello.txt')),
      'tool result is sent back to the model'
    )

    const rejectApprovals: ApprovalRequest[] = []
    const rejectMessages: ChatMessage[] = [{ role: 'user', content: 'Создай reject.txt (reject)' }]
    await runAgent({
      provider: { kind: 'openai', apiKey: 'test-key', baseUrl },
      model: 'mock-model',
      system: 'You are a test agent.',
      messages: rejectMessages,
      projectRoot: project,
      signal: controller.signal,
      emit: () => undefined,
      ...runOpts,
      requestApproval: async (request) => {
        rejectApprovals.push(request)
        return 'deny' as const
      }
    })
    assert.equal(rejectApprovals.length, 1)
    assert.equal(fs.existsSync(path.join(project, 'reject.txt')), false, 'rejected file was not written')

    const anthropicEvents: AgentEvent[] = []
    const anthropicApprovals: ApprovalRequest[] = []
    const anthropicMessages: ChatMessage[] = [{ role: 'user', content: 'Запиши файл через Claude' }]
    await runAgent({
      provider: { kind: 'anthropic', apiKey: 'anthropic-key', baseUrl },
      model: 'claude-test',
      system: 'You are a test agent.',
      messages: anthropicMessages,
      projectRoot: project,
      signal: controller.signal,
      emit: (event) => anthropicEvents.push(event),
      ...runOpts,
      requestApproval: async (request) => {
        anthropicApprovals.push(request)
        return 'once' as const
      }
    })

    assert.equal(anthropicApprovals.length, 1)
    assert.equal(anthropicApprovals[0].path, 'claude.txt')
    assert.equal(
      fs.readFileSync(path.join(project, 'claude.txt'), 'utf8'),
      'Hello from Claude\n'
    )
    const anthropicTextOut = anthropicEvents
      .filter((event): event is Extract<AgentEvent, { type: 'text-delta' }> => event.type === 'text-delta')
      .map((event) => event.text)
      .join('')
    assert.match(anthropicTextOut, /Claude записал файл\. Готово!/)

    const anthropicRequests = requests.filter((request) => request.url === '/v1/messages')
    assert.equal(anthropicRequests.length, 2)
    assert.equal(anthropicRequests[0].headers['x-api-key'], 'anthropic-key')
    const anthropicSecond = anthropicRequests[1].body.messages as Array<{
      role: string
      content: Array<{ type: string; tool_use_id?: string }>
    }>
    const lastTurn = anthropicSecond[anthropicSecond.length - 1]
    assert.equal(lastTurn.role, 'user')
    assert.equal(lastTurn.content[0].type, 'tool_result')
    assert.equal(lastTurn.content[0].tool_use_id, 'toolu_test_1')

    const readAsks: ToolApprovalInput[] = []
    const outsideRead = await runTool(
      'read_file',
      { path: '../secret.txt' },
      {
        ...toolCtx,
        requestApproval: async (input) => {
          readAsks.push(input)
          return 'once' as const
        }
      }
    )
    assert.equal(readAsks.length, 1, 'a foreign path is confirmed before reading')
    assert.equal(readAsks[0].scope, 'read-outside')
    assert.equal(outsideRead.ok, true)
    assert.match(outsideRead.content, /TOP SECRET/)

    const deniedRead = await runTool(
      'read_file',
      { path: '../secret.txt' },
      { ...toolCtx, requestApproval: async () => 'deny' as const }
    )
    assert.equal(deniedRead.ok, false, 'a denied grant blocks the read')

    const grantLog: string[] = []
    const alwaysWrite = await runTool(
      'write_file',
      { path: '../allowed.txt', content: 'ok\n' },
      {
        ...toolCtx,
        grant: (absolute: string) => grantLog.push(absolute),
        requestApproval: async () => 'always' as const
      }
    )
    assert.equal(alwaysWrite.ok, true)
    assert.equal(fs.readFileSync(path.join(workspace, 'allowed.txt'), 'utf8'), 'ok\n')
    assert.deepEqual(grantLog, [workspace], '"always" remembers the parent folder')

    const rejectedWrite = await runTool(
      'write_file',
      { path: 'evil.txt', content: 'hack' },
      { ...toolCtx, requestApproval: async () => 'deny' as const }
    )
    assert.equal(rejectedWrite.ok, false)
    assert.equal(fs.existsSync(path.join(project, 'evil.txt')), false, 'denied write never lands')

    const readOnlyWrite = await runTool(
      'write_file',
      { path: 'readonly.txt', content: 'x' },
      { ...toolCtx, allowWrite: false, requestApproval: async () => 'once' as const }
    )
    assert.equal(readOnlyWrite.ok, false, 'read-only subagents cannot write')

    const listing = await runTool('list_files', {}, { ...toolCtx, requestApproval: async () => 'once' as const })
    assert.equal(listing.ok, true)
    assert.match(listing.content, /src\//)
    assert.doesNotMatch(listing.content, /node_modules/, 'ignored folders are hidden')

    const readInside = await runTool(
      'read_file',
      { path: 'src/index.ts' },
      { ...toolCtx, requestApproval: async () => 'once' as const }
    )
    assert.equal(readInside.ok, true)
    assert.match(readInside.content, /export \{\}/)

    assert.equal(contextLimitForModel('gpt-4o-mini'), 128000)
    assert.equal(contextLimitForModel('claude-sonnet-4'), 200000)
    assert.equal(contextLimitForModel('deepseek-chat'), 128000)
    assert.equal(contextLimitForModel('gemini-2.5-pro'), 1048576)
    assert.ok(
      estimateHistoryTokens([{ role: 'user', content: 'x'.repeat(3200) }], 'system') > 1000,
      'history tokens are estimated from text length'
    )

    const idleHistory: ChatMessage[] = [{ role: 'user', content: 'Привет' }]
    const idleEvents: AgentEvent[] = []
    const idleState = await compactHistoryIfNeeded({
      messages: idleHistory,
      system: 'You are a test agent.',
      provider: { kind: 'openai', apiKey: 'test-key', baseUrl },
      model: 'mock-model',
      signal: controller.signal,
      emit: (event) => idleEvents.push(event),
      source: 'auto'
    })
    assert.equal(idleEvents.length, 0, 'compaction is skipped below the threshold')
    assert.equal(idleHistory.length, 1)
    assert.ok(idleState.used > 0 && idleState.used < idleState.limit)

    const compactHistory: ChatMessage[] = [
      {
        role: 'user',
        content: `Создай hello.txt. ${'Подробности задачи. '.repeat(400)}`
      },
      {
        role: 'assistant',
        content: 'Записываю.',
        toolCalls: [{ id: 'call_ctx_1', name: 'write_file', arguments: '{"path":"hello.txt"}' }]
      },
      { role: 'tool', toolCallId: 'call_ctx_1', content: 'Wrote hello.txt' },
      { role: 'assistant', content: 'Файл создан.' }
    ]
    const compactEvents: AgentEvent[] = []
    const compactedState = await compactHistoryIfNeeded({
      messages: compactHistory,
      system: 'You are a test agent.',
      provider: { kind: 'openai', apiKey: 'test-key', baseUrl },
      model: 'mock-model',
      signal: controller.signal,
      emit: (event) => compactEvents.push(event),
      source: 'auto',
      limit: 2000
    })
    const startEvent = compactEvents.find(
      (event): event is Extract<AgentEvent, { type: 'compact-start' }> =>
        event.type === 'compact-start'
    )
    const endEvent = compactEvents.find(
      (event): event is Extract<AgentEvent, { type: 'compact-end' }> => event.type === 'compact-end'
    )
    assert.equal(startEvent?.source, 'auto', 'automatic compaction starts when the limit is close')
    assert.equal(endEvent?.ok, true, 'compaction finishes successfully')
    assert.equal(compactHistory.length, 2, 'history is replaced by the summary pair')
    assert.match(compactHistory[0].content, /Сводка предыдущей части диалога/)
    assert.match(compactHistory[0].content, /Ключевые факты/)
    assert.ok(compactedState.used < 2000)

    const summaryRequest = requests.find(
      (request) =>
        request.url === '/v1/chat/completions' &&
        !request.body.tools &&
        JSON.stringify(request.body.messages).includes(SUMMARY_MARKER)
    )
    assert.ok(summaryRequest, 'compaction asks the provider for a summary')
    assert.ok(
      JSON.stringify(summaryRequest?.body.messages).includes('Подробности задачи'),
      'the summary request includes the truncated transcript'
    )

    const overflowEvents: AgentEvent[] = []
    const overflowMessages: ChatMessage[] = [
      { role: 'user', content: `Длинная задача. ${'Контекст. '.repeat(400)}` }
    ]
    await runAgent({
      provider: { kind: 'openai', apiKey: 'test-key', baseUrl },
      model: 'overflow-model',
      system: 'You are a test agent.',
      messages: overflowMessages,
      projectRoot: project,
      signal: controller.signal,
      compactThreshold: 0.99,
      emit: (event) => overflowEvents.push(event),
      ...runOpts,
      requestApproval: async () => 'once' as const
    })
    const overflowCompaction = overflowEvents.find(
      (event): event is Extract<AgentEvent, { type: 'compact-end' }> => event.type === 'compact-end'
    )
    assert.ok(overflowCompaction?.ok, 'overflow recovery compacts the live transcript')
    assert.match(
      overflowMessages.at(-1)?.content ?? '',
      /После принудительного сжатия/,
      'the run continues on the compacted transcript'
    )
    assert.equal(overflowAttempts, 2, 'the overflowing request is retried once after compaction')

    const thresholdEvents: AgentEvent[] = []
    const thresholdMessages: ChatMessage[] = [{ role: 'user', content: 'Простой вопрос.' }]
    await runAgent({
      provider: { kind: 'openai', apiKey: 'test-key', baseUrl },
      model: 'overflow-model',
      system: 'You are a test agent.',
      messages: thresholdMessages,
      projectRoot: project,
      signal: controller.signal,
      compactThreshold: 0.0001,
      emit: (event) => thresholdEvents.push(event),
      ...runOpts,
      requestApproval: async () => 'once' as const
    })
    const compactIndex = thresholdEvents.findIndex((event) => event.type === 'compact-end')
    const textIndex = thresholdEvents.findIndex((event) => event.type === 'text-delta')
    assert.ok(compactIndex >= 0 && textIndex >= 0, 'threshold compaction is reported')
    assert.ok(compactIndex < textIndex, 'compaction happens before the answer keeps streaming')
    assert.match(thresholdMessages[0].content, /Сводка предыдущей части диалога/)

    const otherProject = path.join(workspace, 'other')
    fs.mkdirSync(otherProject, { recursive: true })
    const switched: string[] = []
    const projectEvents: AgentEvent[] = []
    await runAgent({
      provider: { kind: 'openai', apiKey: 'test-key', baseUrl },
      model: 'project-model',
      system: 'You are a test agent.',
      messages: [{ role: 'user', content: 'Открой проект Other' }],
      projectRoot: project,
      signal: controller.signal,
      projects: [{ name: 'Other', path: otherProject }],
      onProjectSwitch: (target) => switched.push(target),
      emit: (event) => projectEvents.push(event),
      ...runOpts,
      requestApproval: async () => 'once' as const
    })
    assert.deepEqual(switched, [otherProject], 'the app is told which project to open')
    const projectEnd = projectEvents.find(
      (event): event is Extract<AgentEvent, { type: 'tool-end' }> => event.type === 'tool-end'
    )
    assert.ok(projectEnd?.ok, 'a registered project opens without asking')

    const listed = await runTool(
      'open_project',
      {},
      {
        ...toolCtx,
        projects: [{ name: 'Other', path: otherProject }],
        requestApproval: async () => 'once' as const
      }
    )
    assert.equal(listed.ok, true)
    assert.match(listed.content, /Other/)
    assert.equal(listed.projectSwitch, undefined, 'listing the projects switches nothing')

    const unknown = await runTool(
      'open_project',
      { project: 'Ghost' },
      { ...toolCtx, projects: [], requestApproval: async () => 'once' as const }
    )
    assert.equal(unknown.ok, false, 'unknown project names are rejected')

    const asked: string[] = []
    const foreign = await runTool(
      'open_project',
      { project: otherProject },
      {
        ...toolCtx,
        projects: [],
        requestApproval: async (input) => {
          asked.push(input.absolutePath)
          return 'once' as const
        }
      }
    )
    assert.equal(foreign.ok, true, 'a foreign folder opens after approval')
    assert.deepEqual(asked, [otherProject], 'the user is asked before a new folder becomes the root')

    const refused = await runTool(
      'open_project',
      { project: otherProject },
      { ...toolCtx, projects: [], requestApproval: async () => 'deny' as const }
    )
    assert.equal(refused.ok, false, 'a denied folder never becomes the project root')
    assert.equal(refused.projectSwitch, undefined)

    const shotDir = path.join(workspace, 'shots')
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    )
    let grabs = 0
    const screen = {
      capture: async (display: number) => {
        grabs++
        return {
          buffer: png,
          mime: 'image/png',
          width: 64,
          height: 64,
          label: `Экран ${display}`,
          displays: 1
        }
      },
      save: (buffer: Buffer, display: number): string => {
        fs.mkdirSync(shotDir, { recursive: true })
        const file = path.join(shotDir, `screen-${display}-${grabs}.png`)
        fs.writeFileSync(file, buffer)
        return file
      }
    }

    const shot = await runTool(
      'take_screenshot',
      { display: 2 },
      { ...toolCtx, screen, requestApproval: async () => 'once' as const }
    )
    assert.equal(shot.ok, true)
    assert.equal(grabs, 1, 'the tool asks the app for one display')
    assert.equal(shot.attach?.length, 1, 'the picture travels back to the model')
    assert.equal(shot.attach?.[0].data, png.toString('base64'))
    const shotPath = shot.image?.absolutePath ?? ''
    assert.ok(shotPath.startsWith(shotDir), 'the png lands in the CloseCode folder, not the project')
    assert.equal(fs.existsSync(shotPath), true, 'the user can reopen the saved screenshot')
    assert.equal(
      fs.readdirSync(project).some((name) => name.startsWith('screen-')),
      false,
      'nothing is written into the project'
    )

    const blind = await runTool(
      'take_screenshot',
      {},
      { ...toolCtx, requestApproval: async () => 'once' as const }
    )
    assert.equal(blind.ok, false, 'without a screen the tool explains itself')

    const screenMessages: ChatMessage[] = [{ role: 'user', content: 'Сними экран' }]
    const screenEvents: AgentEvent[] = []
    await runAgent({
      provider: { kind: 'openai', apiKey: 'test-key', baseUrl },
      model: 'screen-model',
      system: 'You are a test agent.',
      messages: screenMessages,
      projectRoot: project,
      signal: controller.signal,
      screen,
      emit: (event) => screenEvents.push(event),
      ...runOpts,
      requestApproval: async () => 'once' as const
    })
    assert.ok(
      screenMessages.some((message) => message.role === 'user' && message.images?.length),
      'the captured picture is offered to the model on a user turn'
    )
    assert.ok(screenEvents.some((event) => event.type === 'image'), 'the user sees the screenshot in the chat')
    const screenOffered = requests
      .filter((request) => request.body.model === 'screen-model')
      .map((request) => JSON.stringify(request.body.tools ?? ''))
    assert.ok(
      screenOffered.every((tools) => tools.includes('take_screenshot')),
      'a run that can grab the screen advertises the tool'
    )
    const plainOffered = requests
      .filter((request) => request.body.model === 'mock-model')
      .map((request) => JSON.stringify(request.body.tools ?? ''))
    assert.ok(
      plainOffered.some((tools) => !tools.includes('take_screenshot')),
      'a run without the capability never offers the tool'
    )
    assert.ok(
      plainOffered.some((tools) => !tools.includes('ask_user')),
      'a run with no user channel does not advertise ask_user either'
    )

    const askedQuestions: { question: string; options: string[]; hint?: string }[] = []
    const answered = await runTool(
      'ask_user',
      {
        question: 'Какой фреймворк?',
        options: ['React', 'Vue', 'React', '', 'Svelte', 'Solid', 'Qwik'],
        hint: 'нужно для новой страницы'
      },
      {
        ...toolCtx,
        requestApproval: async () => 'once' as const,
        requestQuestion: async (input) => {
          askedQuestions.push(input)
          return 'React'
        }
      }
    )
    assert.equal(answered.ok, true)
    assert.match(answered.content, /"React"/, 'the answer reaches the model')
    assert.deepEqual(
      askedQuestions[0].options,
      ['React', 'Vue', 'Svelte', 'Solid'],
      'duplicates and empties drop and four options is the cap'
    )
    assert.equal(askedQuestions[0].question, 'Какой фреймворк?')
    assert.equal(askedQuestions[0].hint, 'нужно для новой страницы')

    const skipped = await runTool(
      'ask_user',
      { question: 'Куда положить файл?' },
      { ...toolCtx, requestApproval: async () => 'once' as const, requestQuestion: async () => '' }
    )
    assert.equal(skipped.ok, true, 'a skipped question still lets the run continue')
    assert.match(skipped.content, /skipped/)

    const mute = await runTool(
      'ask_user',
      { question: 'Куда положить файл?' },
      { ...toolCtx, requestApproval: async () => 'once' as const }
    )
    assert.equal(mute.ok, false, 'a run that cannot reach the user says so')

    const empty = await runTool(
      'ask_user',
      { question: '   ' },
      {
        ...toolCtx,
        requestApproval: async () => 'once' as const,
        requestQuestion: async () => 'должно быть не вызвано'
      }
    )
    assert.equal(empty.ok, false, 'a blank question is refused before it reaches the user')

    const askMessages: ChatMessage[] = [{ role: 'user', content: 'Сделай страницу' }]
    const askEvents: AgentEvent[] = []
    const questionIds: string[] = []
    await runAgent({
      provider: { kind: 'openai', apiKey: 'test-key', baseUrl },
      model: 'ask-model',
      system: 'You are a test agent.',
      messages: askMessages,
      projectRoot: project,
      signal: controller.signal,
      requestQuestion: async (question) => {
        questionIds.push(question.id)
        return 'Vue'
      },
      emit: (event) => askEvents.push(event),
      ...runOpts,
      requestApproval: async () => 'once' as const
    })
    assert.equal(questionIds.length, 1, 'the app is asked exactly once')
    assert.match(questionIds[0], /^[0-9a-f-]{36}$/, 'every question carries an id to answer by')
    assert.ok(
      askMessages.some(
        (message) => message.role === 'tool' && String(message.content).includes('Vue')
      ),
      'the user answer lands in the transcript as the tool result'
    )
    const askEnd = askEvents.find(
      (event): event is Extract<AgentEvent, { type: 'tool-end' }> =>
        event.type === 'tool-end' && event.ok
    )
    assert.ok(askEnd?.detail.includes('Vue'), 'the chat row shows what the user answered')
    const askOffered = requests
      .filter((request) => request.body.model === 'ask-model')
      .map((request) => JSON.stringify(request.body.tools ?? ''))
    assert.ok(
      askOffered.every((tools) => tools.includes('ask_user')),
      'a run that can reach the user advertises the tool'
    )

    const thought = await streamOpenAi({
      apiKey: 'test-key',
      baseUrl,
      model: 'reasoning-only',
      system: 'Review the answer.',
      messages: [{ role: 'user', content: 'Проверь ответ.' }],
      tools: [],
      signal: controller.signal,
      maxTokens: 2048
    }, () => undefined)
    assert.equal(thought.text, REASONING_ONLY_TEXT, 'a thinking-only stream is not an empty answer')

    console.log('✓ OpenAI streaming, tool calls, approval and rejection')
    console.log('✓ Anthropic streaming with tool_use')
    console.log('✓ File write, listing and path sandboxing')
    console.log('✓ Context limits, auto-compaction and summary replacement')
    console.log('✓ Mid-run compaction: overflow retry and threshold-triggered summary')
    console.log('✓ Reasoning deltas become the answer when a model sends no content')
    console.log('✓ open_project lists, switches and asks before a new folder opens')
    console.log('✓ take_screenshot saves outside the project and feeds the picture back')
    console.log('✓ ask_user waits on the user and returns the answer to the model')
    console.log('All agent smoke tests passed.')
  } finally {
    server.close()
    fs.rmSync(workspace, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
