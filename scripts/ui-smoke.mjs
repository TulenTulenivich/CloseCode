import { _electron as electron } from '@playwright/test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const artifacts = path.join(appRoot, '.artifacts')
fs.mkdirSync(artifacts, { recursive: true })

const fileContent = '# Hello from mock\n\nThis file was written by CloseCode.\n'
const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'closecode-ui-project-'))
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'closecode-ui-userdata-'))
const outsideFile = path.join(os.tmpdir(), `closecode-outside-${Date.now()}.txt`)

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let value = n
    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[n] = value
  }
  return table
})()

function crc32(buffer) {
  let value = -1
  for (const byte of buffer) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8)
  return (value ^ -1) >>> 0
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuffer, data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** A real 640×480 PNG so the image path exercises magic-byte sniffing. */
function buildPng(width, height) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 2
  const raw = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1)
    raw[row] = 0
    for (let x = 0; x < width; x++) {
      const t = y / height
      const at = row + 1 + x * 3
      raw[at] = Math.round(240 - 40 * t)
      raw[at + 1] = Math.round(226 - 12 * t + 16 * Math.sin(x / 42))
      raw[at + 2] = Math.round(196 + 28 * t)
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0))
  ])
}

const PNG_IMAGE = buildPng(640, 480)
const imageFilePath = 'images/mock-picture.png'

fs.writeFileSync(path.join(projectDir, 'README.md'), '# Demo project\n\nThis folder was selected for the UI smoke test.\n')
fs.mkdirSync(path.join(userData, 'skills', 'demo-skill'), { recursive: true })
fs.writeFileSync(
  path.join(userData, 'skills', 'demo-skill', 'SKILL.md'),
  '---\nname: Demo skill\ndescription: Adds a short checklist before edits\n---\n\n1. Read the file.\n2. Change it carefully.\n'
)
fs.mkdirSync(path.join(userData, 'agents'), { recursive: true })
fs.writeFileSync(
  path.join(userData, 'agents', 'reviewer.md'),
  '---\nname: Reviewer\ndescription: Reviews diffs before applying\n---\nYou review diffs.\n'
)
fs.writeFileSync(
  path.join(userData, 'settings.json'),
  JSON.stringify({
    version: 1,
    providers: [],
    // Skip the built-in free provider so the counts below stay about the providers this script adds.
    freeSeeded: true,
    activeProviderId: null,
    activeModel: null,
    projectPath: projectDir
  })
)

// The summary call is recognised by its language-independent system prompt.
const SUMMARY_MARKER = 'You compress the history of a coding agent conversation'

const requests = []
const server = http.createServer(async (req, res) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  const body = raw ? JSON.parse(raw) : {}
  requests.push({ method: req.method, url: req.url, headers: req.headers, body })

  if (req.method === 'GET' && req.url === '/v1/models') {
    if (req.headers.authorization !== 'Bearer ui-test-key') {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: { message: 'bad key' } }))
      return
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        object: 'list',
        data: [{ id: 'gpt-5-nano' }, { id: 'gpt-5-mini' }, { id: 'gpt-image-1' }]
      })
    )
    return
  }

  if (req.method === 'POST' && req.url === '/v1/images/generations') {
    if (req.headers.authorization !== 'Bearer ui-test-key') {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: { message: 'bad key' } }))
      return
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ created: Math.floor(Date.now() / 1000), data: [{ b64_json: PNG_IMAGE.toString('base64') }] }))
    return
  }

  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    })
    const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`)
    const messages = body.messages ?? []
    const systemText = messages
      .filter((message) => message.role === 'system')
      .map((message) => String(message.content ?? ''))
      .join('\n')
    if (systemText.includes('You name coding tasks')) {
      for (const piece of ['Создать ', 'файл ', 'приветствия']) {
        send({ choices: [{ delta: { content: piece } }] })
      }
      send({ choices: [{ delta: {}, finish_reason: 'stop' }] })
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }
    if (systemText.includes('meticulous second reviewer')) {
      for (const piece of ['**Проверил ответ независимо.** ', 'Блокирующих ошибок не нашёл.']) {
        send({ choices: [{ delta: { content: piece } }] })
      }
      send({ choices: [{ delta: {}, finish_reason: 'stop' }] })
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }
    const isCompaction =
      !body.tools &&
      messages.some((message) => String(message.content ?? '').includes(SUMMARY_MARKER))
    if (isCompaction) {
      for (const piece of ['Сводка: пользователь просил создать app.txt. ', 'Файл создан, ', 'осталось подтвердить результат.']) {
        send({ choices: [{ delta: { content: piece } }] })
      }
      send({ choices: [{ delta: {}, finish_reason: 'stop' }] })
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }
    // A fresh prompt asks for a tool call; a tool result or a repeated turn gets the answer.
    const last = messages[messages.length - 1] ?? {}
    const lastUser = [...messages].reverse().find((message) => message.role === 'user')
    const lastUserText = String(lastUser?.content ?? '')
    const wantsImage = /нарису|изображен|картин|пейзаж|draw|image/i.test(lastUserText)
    const imageDone = messages.some(
      (message) =>
        message.role === 'tool' && String(message.content ?? '').includes('Generated an image')
    )
    if (last.role === 'user') {
      if (wantsImage) {
        send({ choices: [{ delta: { role: 'assistant', content: 'Генерирую изображение. ' } }] })
        send({
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: 'call_ui_image',
                    type: 'function',
                    function: { name: 'generate_image', arguments: '' }
                  }
                ]
              }
            }
          ]
        })
        const imageArgs = JSON.stringify({
          prompt: 'A calm green valley at golden hour, soft light, painterly style',
          path: imageFilePath
        })
        send({
          choices: [
            { delta: { tool_calls: [{ index: 0, function: { arguments: imageArgs.slice(0, 24) } }] } }
          ]
        })
        send({
          choices: [
            { delta: { tool_calls: [{ index: 0, function: { arguments: imageArgs.slice(24) } }] } }
          ]
        })
        send({ choices: [{ delta: {}, finish_reason: 'tool_calls' }] })
        res.write('data: [DONE]\n\n')
        res.end()
        return
      }
      const target = /снаружи|outside/i.test(lastUserText) ? outsideFile : 'app.txt'
      send({ choices: [{ delta: { role: 'assistant', content: `Создаю файл ${target}. ` } }] })
      send({
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: 'call_ui_1',
                  type: 'function',
                  function: { name: 'write_file', arguments: '' }
                }
              ]
            }
          }
        ]
      })
      const args = JSON.stringify({ path: target, content: fileContent })
      send({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: args.slice(0, 18) } }] } }] })
      send({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: args.slice(18) } }] } }] })
      send({ choices: [{ delta: {}, finish_reason: 'tool_calls' }] })
      res.write('data: [DONE]\n\n')
    } else if (imageDone) {
      for (const piece of ['Готово! ', 'Изображение ', '`images/mock-picture.png` ', 'сохранено в проекте.']) {
        send({ choices: [{ delta: { content: piece } }] })
      }
      send({ choices: [{ delta: {}, finish_reason: 'stop' }] })
      res.write('data: [DONE]\n\n')
    } else {
      for (const piece of ['Готово! ', 'Файл ', '`app.txt` ', 'создан и записан на диск.']) {
        send({ choices: [{ delta: { content: piece } }] })
      }
      send({ choices: [{ delta: {}, finish_reason: 'stop' }] })
      res.write('data: [DONE]\n\n')
    }
    res.end()
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'not found' }))
})

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port
const baseUrl = `http://127.0.0.1:${port}/v1`

const consoleErrors = []
let app

const chatRequests = () =>
  requests.filter((request) => request.method === 'POST' && request.url === '/v1/chat/completions')
const agentRequests = () =>
  chatRequests().filter(
    (request) => Array.isArray(request.body.tools) && request.body.tools.length > 0
  )
const imageRequests = () =>
  requests.filter((request) => request.method === 'POST' && request.url === '/v1/images/generations')

const messageText = (message) =>
  typeof message.content === 'string'
    ? message.content
    : Array.isArray(message.content)
      ? message.content
          .filter((part) => part && part.type === 'text')
          .map((part) => String(part.text ?? ''))
          .join('\n')
      : ''

async function waitFor(check, message, timeout = 20000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    if (check()) return
    await new Promise((resolve) => setTimeout(resolve, 120))
  }
  throw new Error(message)
}

async function launchApp() {
  const env = {
    ...process.env,
    CLOSECODE_USER_DATA: userData,
    ELECTRON_DISABLE_SECURITY_WARNINGS: '1'
  }
  delete env.ELECTRON_RUN_AS_NODE
  const electronApp = await electron.launch({
    args: [appRoot],
    cwd: appRoot,
    env
  })
  const page = await electronApp.firstWindow()
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`console: ${message.text()}`)
  })
  await page.waitForLoadState('domcontentloaded')
  return { electronApp, page }
}

async function waitForFile(target) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (fs.existsSync(target)) return fs.readFileSync(target, 'utf8')
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`File was not created: ${target}`)
}

// Tool rows are collapsed inside a group once the run finishes.
async function expandToolGroup(page, index = 0) {
  const head = page.locator('.tool-group-head').nth(index)
  await head.waitFor({ timeout: 20000 })
  await page.waitForTimeout(400)
  if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click()
  return head
}

const rail = (dialog, label) =>
  dialog.locator(`.rail-btn:has(.rail-label:text-is("${label}"))`)

try {
  const launched = await launchApp()
  app = launched.electronApp
  const page = launched.page

  const settingsDialog = page.getByRole('dialog', { name: 'Настройки', exact: true })
  await settingsDialog.waitFor({ timeout: 20000 })
  for (const label of ['Основные', 'Оформление', 'Поведение агента', 'Провайдеры', 'Модели', 'Проекты', 'Доступы', 'Skills', 'Агенты']) {
    await rail(settingsDialog, label).waitFor()
  }
  await page.waitForTimeout(350)
  await page.screenshot({ path: path.join(artifacts, '01-settings-empty.png'), animations: 'disabled' })

  await settingsDialog.getByRole('button', { name: 'OpenAI', exact: true }).click()
  await settingsDialog.getByLabel('Base URL').fill(baseUrl)
  await settingsDialog.getByLabel('API-ключ').fill('ui-test-key')
  await settingsDialog.getByLabel('Список моделей').fill('')
  await settingsDialog.getByRole('button', { name: 'Загрузить модели' }).click()
  await settingsDialog.getByText('Моделей: 3').waitFor({ timeout: 15000 })
  const fetched = (await settingsDialog.getByLabel('Список моделей').inputValue()).split('\n').sort()
  assert.deepEqual(
    fetched,
    ['gpt-5-mini', 'gpt-5-nano', 'gpt-image-1'],
    'model discovery fills the list, including image models'
  )
  await page.screenshot({ path: path.join(artifacts, '02-settings-filled.png'), animations: 'disabled' })

  await settingsDialog.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await settingsDialog.getByText('ключ сохранён').waitFor({ timeout: 15000 })
  await settingsDialog.getByRole('button', { name: 'Закрыть настройки' }).click()
  await settingsDialog.waitFor({ state: 'detached', timeout: 15000 })

  const modelButton = page.getByRole('button', { name: 'Активная модель', exact: true })
  await modelButton.waitFor({ timeout: 10000 })
  assert.match(await modelButton.innerText(), /GPT 5 Mini/)
  await modelButton.click()
  await page.getByRole('listbox', { name: 'Модели' }).waitFor({ timeout: 10000 })
  await page.getByRole('option', { name: /GPT 5 Nano/ }).click()
  await page.locator('.model-picker-btn').filter({ hasText: 'GPT 5 Nano' }).waitFor({ timeout: 10000 })

  const contextButton = page.getByRole('button', { name: /^Контекст:/ })
  await contextButton.waitFor({ timeout: 10000 })
  assert.match(await contextButton.getAttribute('aria-label'), /осталось/)
  await page.locator('.workspace-footer .load-btn').waitFor({ timeout: 10000 })

  const projectName = path.basename(projectDir)
  await page.locator('.project-chip').filter({ hasText: projectName }).waitFor()
  await page.locator('.hero-title').filter({ hasText: projectName }).waitFor()
  await page.getByRole('button', { name: 'Новая задача' }).waitFor({ timeout: 10000 })
  await page.locator('.provider-cluster-logos .brand-logo').first().waitFor({ timeout: 10000 })
  assert.equal(
    await page.locator('.suggestions, .welcome-activity, .heatmap.wide').count(),
    0,
    'welcome screen has no activity block or starter suggestions'
  )

  const heatmap = page.locator('.sidebar .heatmap.seasonal')
  await heatmap.locator('.heat-cell').first().waitFor({ timeout: 10000 })
  assert.equal(await heatmap.locator('.season-month').count(), 3, 'a season shows exactly three months')
  assert.equal(await heatmap.locator('.season-grid').count(), 3)
  assert.equal(await heatmap.locator('.season-grid .heat-cell').count(), 126, 'three months of day cells')
  const seasonLabel = await heatmap.locator('.season-label').innerText()
  assert.match(seasonLabel, /(Весна|Лето|Осень|Зима) \d{4}(\/\d{2})?/)
  await heatmap.locator('.season-arrow.prev').click()
  await page.waitForTimeout(300)
  assert.notEqual(
    await heatmap.locator('.season-label').innerText(),
    seasonLabel,
    'previous season pages back'
  )
  await heatmap.locator('.season-arrow.next').click()
  await page.waitForTimeout(300)
  assert.equal(
    await heatmap.locator('.season-label').innerText(),
    seasonLabel,
    'next returns to the original season'
  )
  await page.waitForTimeout(250)
  await page.screenshot({ path: path.join(artifacts, '03-main-empty.png'), animations: 'disabled' })
  await heatmap.screenshot({ path: path.join(artifacts, '08-activity-empty.png'), animations: 'disabled' })

  await page.getByLabel('Файлы и фото для контекста').setInputFiles(path.join(projectDir, 'README.md'))
  await page.locator('.attach-chip').filter({ hasText: 'README.md' }).waitFor({ timeout: 10000 })

  // Photos can be picked or pasted straight into the composer and are previewed as thumbnails.
  await page.getByLabel('Файлы и фото для контекста').setInputFiles({
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: PNG_IMAGE
  })
  await page.locator('.attach-chip.image').filter({ hasText: 'photo.png' }).waitFor({ timeout: 10000 })
  await page.locator('.attach-thumb').first().waitFor({ timeout: 10000 })
  await page.getByLabel('Сообщение агенту').evaluate((element, base64) => {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
    const transfer = new DataTransfer()
    transfer.items.add(new File([bytes], 'clipboard-photo.png', { type: 'image/png' }))
    element.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true })
    )
  }, PNG_IMAGE.toString('base64'))
  await page
    .locator('.attach-chip.image')
    .filter({ hasText: 'clipboard-photo.png' })
    .waitFor({ timeout: 10000 })
  await page.waitForTimeout(200)
  await page.screenshot({ path: path.join(artifacts, '20-photo-composer.png'), animations: 'disabled' })

  // Per-model thinking levels: GPT-5 exposes exactly the four values its public API accepts.
  await page.locator('.effort-btn').click()
  const effortPopover = page.locator('.effort-popover')
  await effortPopover.waitFor({ timeout: 10000 })
  assert.equal(
    await effortPopover.locator('.effort-option').count(),
    4,
    'reasoning model offers four real effort grades'
  )
  const activeEffort = await effortPopover.locator('.effort-option.selected').innerText()
  assert.match(activeEffort, /medium/i, 'the current level uses its API value')
  assert.doesNotMatch(activeEffort, /Средний/i, 'levels are not translated')
  await page.screenshot({ path: path.join(artifacts, '13-effort-picker.png'), animations: 'disabled' })
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(artifacts, '13b-effort-picker-settled.png'), animations: 'disabled' })
  await effortPopover.locator('.effort-option').filter({ hasText: 'high' }).click()
  await page.locator('.effort-btn').filter({ hasText: 'high' }).waitFor()

  await page.getByLabel('Сообщение агенту').fill('Создай файл app.txt с приветствием')
  await page.getByLabel('Сообщение агенту').press('Enter')

  const approvalDialog = page.getByRole('dialog', { name: 'Подтверждение изменения файла' })
  await approvalDialog.waitFor({ timeout: 20000 })
  await page.locator('.diff-line.add').first().waitFor({ timeout: 10000 })
  assert.ok((await page.locator('.diff-line.add').count()) >= 3, 'diff shows added lines')
  await approvalDialog.getByText('app.txt', { exact: true }).waitFor()
  await page.waitForTimeout(250)
  await page.screenshot({ path: path.join(artifacts, '04-approval.png'), animations: 'disabled' })

  await page.getByRole('button', { name: 'Применить изменения' }).click()
  await page.locator('.assistant-body').filter({ hasText: 'Файл app.txt создан' }).waitFor({ timeout: 20000 })
  const toolGroup = await expandToolGroup(page)
  assert.match(await toolGroup.innerText(), /Выполнил 1 инструмент/)
  await page.locator('.tool-row.ok').waitFor({ timeout: 10000 })
  await page.locator('.message-file').filter({ hasText: 'README.md' }).waitFor({ timeout: 10000 })
  assert.equal(
    await page.locator('.user-image img').count(),
    2,
    'sent photos are shown as thumbnails in the chat'
  )
  await page.locator('.user-image').first().scrollIntoViewIfNeeded()
  await page.waitForTimeout(250)
  await page.screenshot({ path: path.join(artifacts, '20-photo-chat.png'), animations: 'disabled' })
  await page.locator('.user-image').first().click()
  await page.locator('.user-image-zoom img').waitFor({ timeout: 5000 })
  await page.screenshot({ path: path.join(artifacts, '20-photo-zoom.png'), animations: 'disabled' })
  await page.keyboard.press('Escape')
  await page.locator('.user-image-zoom').waitFor({ state: 'detached', timeout: 5000 })
  await page.locator('.chat-scroll').evaluate((element) => {
    element.scrollTop = 0
  })
  assert.equal(await waitForFile(path.join(projectDir, 'app.txt')), fileContent)
  await page
    .locator('.task-name')
    .filter({ hasText: 'Создать файл приветствия' })
    .waitFor({ timeout: 15000 })
  await page.locator('.run-strip').waitFor({ timeout: 10000 })
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(artifacts, '05-chat-done.png'), animations: 'disabled' })

  await page
    .locator('.sidebar .heatmap-summary')
    .filter({ hasText: /1 сообщение/ })
    .waitFor({ timeout: 15000 })
  await page.locator('.sidebar .heat-cell.level-4').first().waitFor({ timeout: 10000 })
  await heatmap.screenshot({ path: path.join(artifacts, '09-activity-side.png'), animations: 'disabled' })

  const firstRun = agentRequests()
  assert.equal(firstRun.length, 2, 'mock model was called twice (tool round + answer)')
  assert.equal(firstRun[0].body.reasoning_effort, 'high', 'the top effort maps to high')
  assert.ok(
    firstRun[1].body.messages.some((message) => message.role === 'tool' && message.content.includes('Wrote app.txt')),
    'tool result was sent back to the model'
  )
  assert.ok(
    firstRun[0].body.messages.some(
      (message) =>
        message.role === 'user' &&
        messageText(message).includes('Вложенный файл: README.md') &&
        messageText(message).includes('This folder was selected for the UI smoke test.')
    ),
    'attachment content is sent to the model'
  )
  assert.ok(
    firstRun[0].body.messages.some(
      (message) =>
        message.role === 'user' &&
        Array.isArray(message.content) &&
        message.content.filter(
          (part) => part.type === 'image_url' && String(part.image_url?.url).startsWith('data:image/')
        ).length === 2
    ),
    'both photos are sent to the model as vision parts'
  )
  const titleRequests = chatRequests().filter((request) =>
    JSON.stringify(request.body.messages ?? []).includes('You name coding tasks')
  )
  assert.equal(titleRequests.length, 1, 'the first turn asks the model for a task title')

  // Second opinion: another model reviews the latest finished answer.
  await page.locator('.run-opinion').click()
  const opinionPanel = page.locator('.opinion-panel')
  await opinionPanel.waitFor({ timeout: 10000 })
  await opinionPanel.getByText('Проверил ответ независимо').waitFor({ timeout: 20000 })
  await page.waitForTimeout(250)
  await page.screenshot({ path: path.join(artifacts, '14-second-opinion.png'), animations: 'disabled' })
  await page.keyboard.press('Escape')
  await opinionPanel.waitFor({ state: 'detached', timeout: 5000 })

  // Writing outside the project asks for an explicit folder grant.
  const requestsBeforeOutside = chatRequests().length
  await page.getByLabel('Сообщение агенту').fill('Создай файл снаружи проекта')
  await page.getByLabel('Сообщение агенту').press('Enter')
  const outsideDialog = page.getByRole('dialog', { name: 'Доступ вне папки проекта' })
  await outsideDialog.waitFor({ timeout: 20000 })
  await page.locator('.approval-file-icon.outside').waitFor({ timeout: 10000 })
  assert.equal(
    await outsideDialog.locator('.diff-stats .del').count(),
    0,
    'new file hides the empty "−0" stat'
  )
  assert.equal(await outsideDialog.locator('.diff-stats .add').count(), 1)
  await page.screenshot({ path: path.join(artifacts, '10-approval-outside.png'), animations: 'disabled' })
  await outsideDialog.getByRole('button', { name: 'Всегда разрешать эту папку' }).click()
  assert.equal(await waitForFile(outsideFile), fileContent)
  await waitFor(
    () => chatRequests().length > requestsBeforeOutside,
    'outside write continues after the grant'
  )
  await page.locator('.run-opinion').waitFor({ timeout: 20000 })

  // Image generation: preview approval, save into the project and render the image card.
  await page.getByLabel('Сообщение агенту').fill('Нарисуй пейзаж для главной страницы')
  await page.getByLabel('Сообщение агенту').press('Enter')
  const imageDialog = page.getByRole('dialog', { name: 'Сохранение изображения' })
  await imageDialog.waitFor({ timeout: 20000 })
  await imageDialog.locator('.approval-image-frame img').waitFor({ timeout: 10000 })
  const preview = await imageDialog.locator('.approval-image-frame img').getAttribute('src')
  assert.match(preview, /^data:image\/png;base64,/, 'approval shows a PNG preview')
  assert.equal(await imageDialog.locator('.diff-stats').count(), 0, 'image approval hides diff stats')
  await page.waitForTimeout(250)
  await page.screenshot({ path: path.join(artifacts, '15-approval-image.png'), animations: 'disabled' })
  await imageDialog.getByRole('button', { name: 'Сохранить изображение' }).click()

  const savedImage = path.join(projectDir, imageFilePath)
  await waitFor(() => fs.existsSync(savedImage), 'generated image is written to the project')
  const imageBytes = fs.readFileSync(savedImage)
  assert.deepEqual(
    [...imageBytes.subarray(0, 8)],
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    'saved file is a real PNG'
  )
  await page.locator('.image-card img').waitFor({ timeout: 20000 })
  await page.locator('.image-card .image-caption').filter({ hasText: imageFilePath }).waitFor()
  await page.locator('.run-opinion').waitFor({ timeout: 20000 })
  await page.waitForTimeout(250)
  await page.screenshot({ path: path.join(artifacts, '16-image-done.png'), animations: 'disabled' })

  const imageCall = imageRequests().at(-1)
  assert.equal(imageCall?.body.model, 'gpt-image-1', 'the configured image model generates the picture')
  assert.equal(imageCall?.body.prompt, 'A calm green valley at golden hour, soft light, painterly style')
  assert.equal(imageCall?.body.size, '1024x1024')
  assert.equal(imageCall?.headers.authorization, 'Bearer ui-test-key')

  // Settings read back every change: appearance, behavior, language, projects, grants, skills, agents.
  await page.locator('.app-chrome').getByRole('button', { name: 'Настройки' }).click()
  const prefs = page.getByRole('dialog', { name: 'Настройки', exact: true })
  await prefs.waitFor({ timeout: 10000 })
  await rail(prefs, 'Оформление').click()
  await prefs.locator('.theme-card.active').filter({ hasText: 'Графит' }).waitFor()
  assert.equal(await prefs.locator('.theme-card').count(), 3, 'graphite, midnight and light themes')
  assert.equal(await prefs.locator('.accent-btn').count(), 6, 'six accent palettes')
  await prefs.locator('.accent-btn.active').filter({ hasText: 'Тёмно-серый' }).waitFor()
  await prefs.locator('.theme-card').filter({ hasText: 'Полночь' }).click()
  await prefs.locator('.accent-btn').filter({ hasText: 'Фиолетовый' }).click()
  await prefs.locator('.seg-btn').filter({ hasText: 'Компактно' }).click()
  await prefs.locator('.seg-btn').filter({ hasText: 'Спокойные' }).click()
  await page.waitForTimeout(400)
  const applied = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    accent: document.documentElement.dataset.accent,
    density: document.documentElement.dataset.density,
    motion: document.documentElement.dataset.motion
  }))
  assert.deepEqual(applied, { theme: 'midnight', accent: 'violet', density: 'compact', motion: 'calm' })
  await page.screenshot({ path: path.join(artifacts, '17-appearance.png'), animations: 'disabled' })
  await prefs.locator('.seg-btn').filter({ hasText: '110%' }).click()
  await page.waitForTimeout(300)
  await prefs.locator('.seg-btn.active').filter({ hasText: '110%' }).waitFor()
  await prefs.locator('.seg-btn').filter({ hasText: /^100%$/ }).click()
  await prefs.locator('.theme-card').filter({ hasText: 'Графит' }).click()
  await prefs.locator('.accent-btn').filter({ hasText: 'Тёмно-серый' }).click()
  await prefs.locator('.seg-btn').filter({ hasText: 'Просторно' }).click()
  await prefs.locator('.seg-btn').filter({ hasText: 'Полные' }).click()
  await page.waitForTimeout(300)

  await rail(prefs, 'Поведение агента').click()
  const importantOnly = prefs.getByRole('radio', { name: /Только важное/ })
  await importantOnly.click()
  await page.waitForTimeout(300)
  assert.equal(await importantOnly.getAttribute('aria-checked'), 'true')
  const compactRange = prefs.locator('.compact-range')
  await compactRange.focus()
  for (let step = 0; step < 5; step++) await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(500)
  assert.match(await prefs.locator('.compact-head strong').innerText(), /75%/)
  await page.screenshot({ path: path.join(artifacts, '18-behavior.png'), animations: 'disabled' })
  await prefs.getByRole('radio', { name: /Всегда спрашивать/ }).click()
  await page.waitForTimeout(300)

  const reviewerGroup = prefs.getByRole('radiogroup', { name: 'Модель-рецензор' })
  const reviewerChip = reviewerGroup.locator('.reviewer-chip').nth(1)
  const reviewerName = (await reviewerChip.innerText()).split('\n')[0]
  await reviewerChip.click()
  await page.waitForTimeout(300)
  assert.equal(
    await reviewerChip.getAttribute('aria-checked'),
    'true',
    'the second-opinion reviewer model is chosen in settings'
  )
  await page.screenshot({ path: path.join(artifacts, '18b-reviewer.png'), animations: 'disabled' })

  await rail(prefs, 'Основные').click()
  await prefs.getByRole('group', { name: 'Язык интерфейса' }).getByRole('button', { name: 'English' }).click()
  const english = page.getByRole('dialog', { name: 'Settings', exact: true })
  await english.waitFor({ timeout: 10000 })
  await english.locator('.rail-label:text-is("Providers")').waitFor()
  await page.locator('.app-chrome').getByRole('button', { name: 'Settings' }).waitFor()
  await english.getByRole('group', { name: 'Interface language' }).getByRole('button', { name: 'Русский' }).click()
  await page.getByRole('dialog', { name: 'Настройки', exact: true }).waitFor({ timeout: 10000 })

  await rail(prefs, 'Проекты').click()
  await prefs.locator('.row-item').filter({ hasText: projectName }).getByText('активен').waitFor()

  await rail(prefs, 'Доступы').click()
  const grantedRow = prefs.locator('.row-item').filter({ hasText: os.tmpdir() })
  await grantedRow.waitFor({ timeout: 10000 })
  await page.screenshot({ path: path.join(artifacts, '11-settings-access.png'), animations: 'disabled' })
  await grantedRow.getByRole('button', { name: 'Отозвать' }).click()
  await prefs.getByText('Нет сохранённых разрешений вне проекта.').waitFor({ timeout: 10000 })

  await rail(prefs, 'Skills').click()
  const skillRow = prefs.locator('.row-item').filter({ hasText: 'Demo skill' })
  await skillRow.waitFor({ timeout: 10000 })
  const skillSwitch = skillRow.getByRole('switch')
  assert.equal(await skillSwitch.getAttribute('aria-checked'), 'false')
  await skillSwitch.click()
  await page.waitForTimeout(400)
  assert.equal(await skillSwitch.getAttribute('aria-checked'), 'true', 'skill toggle turns the skill on')

  await rail(prefs, 'Агенты').click()
  await prefs.locator('.row-item').filter({ hasText: 'Reviewer' }).waitFor({ timeout: 10000 })
  await rail(prefs, 'Skills').click()
  await page.waitForTimeout(250)
  await page.screenshot({ path: path.join(artifacts, '12-settings-skills.png'), animations: 'disabled' })
  await prefs.getByRole('button', { name: 'Закрыть настройки' }).click()
  await prefs.waitFor({ state: 'detached', timeout: 10000 })

  // Private session keeps future turns out of the project history.
  const privateToggle = page.locator('.private-toggle')
  assert.equal(await privateToggle.getAttribute('aria-checked'), 'false')
  await privateToggle.click()
  await page.waitForTimeout(300)
  assert.equal(
    await privateToggle.getAttribute('aria-checked'),
    'true',
    'private session can be switched on'
  )
  await page.screenshot({ path: path.join(artifacts, '19-private.png'), animations: 'disabled' })
  await privateToggle.click()
  await page.waitForTimeout(200)
  assert.equal(await privateToggle.getAttribute('aria-checked'), 'false')

  await contextButton.click()
  const contextDialog = page.getByRole('dialog', { name: 'Окно контекста' })
  await contextDialog.waitFor({ timeout: 10000 })
  await contextDialog.getByRole('button', { name: 'Сжать контекст сейчас' }).click()
  await page.locator('.compaction-row.ok').waitFor({ timeout: 20000 })
  assert.match(await page.locator('.compaction-row.ok').innerText(), /Контекст сжат/)
  const summaryRequests = requests.filter(
    (request) =>
      request.url === '/v1/chat/completions' &&
      !request.body.tools &&
      JSON.stringify(request.body.messages).includes(SUMMARY_MARKER)
  )
  assert.equal(summaryRequests.length, 1, 'manual compaction asks the provider for a summary')
  await page.screenshot({ path: path.join(artifacts, '07-compaction.png'), animations: 'disabled' })

  await app.close()
  app = null

  // Relaunch to verify settings, the encrypted key and the skill toggle persist.
  const relaunched = await launchApp()
  app = relaunched.electronApp
  const page2 = relaunched.page
  const modelButton2 = page2.getByRole('button', { name: 'Активная модель', exact: true })
  await modelButton2.waitFor({ timeout: 15000 })
  assert.match(await modelButton2.innerText(), /GPT 5 Nano/)
  await page2.locator('.task-name').filter({ hasText: 'Создать файл приветствия' }).waitFor({ timeout: 15000 })
  await page2.locator('.effort-btn').filter({ hasText: 'high' }).waitFor({ timeout: 10000 })
  const restored = await page2.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    accent: document.documentElement.dataset.accent,
    density: document.documentElement.dataset.density,
    mode: document.documentElement.dataset.mode
  }))
  assert.deepEqual(restored, { theme: 'graphite', accent: 'graphite', density: 'comfy', mode: 'app' })
  await page2.locator('.app-chrome').getByRole('button', { name: 'Настройки' }).click()
  const persisted = page2.getByRole('dialog', { name: 'Настройки', exact: true })
  await persisted.waitFor({ timeout: 10000 })
  await rail(persisted, 'Поведение агента').click()
  assert.equal(await persisted.locator('.compact-range').inputValue(), '75', 'compact threshold survives a restart')
  assert.match(
    await persisted
      .getByRole('radiogroup', { name: 'Модель-рецензор' })
      .locator('.reviewer-chip.active')
      .innerText(),
    new RegExp(reviewerName),
    'the reviewer model survives a restart'
  )
  await persisted.getByRole('radio', { name: /Всегда спрашивать/ }).waitFor()
  await rail(persisted, 'Провайдеры').click()
  await persisted.getByText('ключ сохранён').waitFor({ timeout: 10000 })
  await page2.waitForTimeout(250)
  await page2.screenshot({ path: path.join(artifacts, '06-settings-persisted.png'), animations: 'disabled' })

  await rail(persisted, 'Доступы').click()
  await persisted.getByText('Нет сохранённых разрешений вне проекта.').waitFor({ timeout: 10000 })
  await rail(persisted, 'Skills').click()
  const persistedSkill = persisted.locator('.row-item').filter({ hasText: 'Demo skill' }).getByRole('switch')
  await persistedSkill.waitFor({ timeout: 10000 })
  assert.equal(await persistedSkill.getAttribute('aria-checked'), 'true', 'enabled skill survives a restart')

  // Mini terminal: overlays render inside the compact window instead of expanding it.
  await rail(persisted, 'Оформление').click()
  await persisted.getByRole('button', { name: /Мини-терминал/ }).click()
  await page2.waitForFunction(() => document.documentElement.dataset.mode === 'terminal', null, {
    timeout: 10000
  })
  await page2.waitForTimeout(600)
  const overlayWindow = await page2.evaluate(() => {
    const screen = document.querySelector('.settings-screen')
    const box = screen?.getBoundingClientRect()
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      screen: box ? { width: box.width, height: box.height } : null,
      controls: document.querySelectorAll('.window-controls .window-btn').length,
      handles: document.querySelectorAll('.resize-handle').length
    }
  })
  assert.ok(overlayWindow.width <= 760, `mini terminal window is compact (${overlayWindow.width}px)`)
  assert.ok(overlayWindow.height <= 560, `mini terminal window stays short (${overlayWindow.height}px)`)
  assert.ok(overlayWindow.screen, 'settings render inside the mini terminal')
  assert.ok(
    Math.abs(overlayWindow.screen.width - overlayWindow.width) <= 1 &&
      Math.abs(overlayWindow.screen.height - overlayWindow.height) <= 1,
    'settings fill the mini terminal without enlarging it'
  )
  assert.equal(overlayWindow.controls, 3, 'custom window controls are present in the terminal')
  assert.equal(overlayWindow.handles, 8, 'all eight resize handles are present')
  await page2.screenshot({ path: path.join(artifacts, '21-terminal-settings.png'), animations: 'disabled' })
  await persisted.locator('.modal-actions .primary-btn').click()
  await persisted.waitFor({ state: 'detached', timeout: 10000 })
  await page2.waitForTimeout(500)
  const compactWindow = await page2.evaluate(() => ({
    mode: document.documentElement.dataset.mode,
    width: window.innerWidth,
    height: window.innerHeight,
    sidebar: document.querySelectorAll('.sidebar').length,
    header: document.querySelectorAll('.terminal-chrome').length,
    controls: document.querySelectorAll('.window-controls .window-btn').length,
    handles: document.querySelectorAll('.resize-handle').length
  }))
  assert.equal(compactWindow.mode, 'terminal')
  assert.equal(compactWindow.sidebar, 0, 'mini terminal hides the sidebar')
  assert.equal(compactWindow.header, 1, 'mini terminal shows its compact header')
  assert.equal(
    compactWindow.width,
    overlayWindow.width,
    'closing settings keeps the mini terminal window size'
  )
  assert.equal(
    compactWindow.height,
    overlayWindow.height,
    'closing settings keeps the mini terminal window height'
  )
  assert.equal(compactWindow.controls, 3, 'terminal header keeps the window controls')
  assert.equal(compactWindow.handles, 8, 'terminal window keeps the resize handles')
  await page2.getByRole('button', { name: 'Развернуть на весь экран' }).click()
  await page2.waitForFunction(() => document.documentElement.dataset.maximized === 'true', null, {
    timeout: 10000
  })
  await page2.getByRole('button', { name: 'Вернуть прежний размер' }).click()
  await page2.waitForFunction(() => document.documentElement.dataset.maximized !== 'true', null, {
    timeout: 10000
  })
  // The mini terminal opens on a real ConPTY shell backed by xterm.js.
  await page2.locator('.shell-view .xterm').waitFor({ timeout: 15000 })
  await page2.locator('.shell-status-dot.running').waitFor({ timeout: 20000 })
  await page2.locator('.shell-host').click()
  await page2.keyboard.type("Write-Output ('smoke'+'-ok')")
  await page2.keyboard.press('Enter')
  await page2.waitForFunction(
    () => document.querySelector('.shell-view .xterm-screen')?.textContent?.includes('smoke-ok'),
    null,
    { timeout: 20000 }
  )
  await page2.screenshot({ path: path.join(artifacts, '22-terminal-shell.png'), animations: 'disabled' })
  await page2.getByRole('tab', { name: 'Агент' }).click()
  await page2.locator('.term-welcome, .user-row').first().waitFor({ timeout: 10000 })
  await page2.screenshot({ path: path.join(artifacts, '22-terminal.png'), animations: 'disabled' })

  await app.close()
  app = null

  // The compact window type survives a restart and can be expanded back.
  const terminalBoot = await launchApp()
  app = terminalBoot.electronApp
  const page3 = terminalBoot.page
  await page3.waitForFunction(() => document.documentElement.dataset.mode === 'terminal', null, {
    timeout: 15000
  })
  await page3.locator('.terminal-chrome').waitFor({ timeout: 15000 })
  const bootWidth = await page3.evaluate(() => window.innerWidth)
  assert.ok(bootWidth < 900, `mini terminal starts compact (${bootWidth}px)`)
  await page3.screenshot({ path: path.join(artifacts, '23-terminal-boot.png'), animations: 'disabled' })
  await page3.getByRole('button', { name: 'Открыть в приложении' }).click()
  await page3.waitForFunction(() => document.documentElement.dataset.mode === 'app', null, {
    timeout: 10000
  })
  await page3.locator('.sidebar').waitFor({ timeout: 10000 })
  await page3.waitForFunction((width) => window.innerWidth > width + 200, bootWidth, {
    timeout: 10000
  })
  assert.equal(await page3.locator('.terminal-chrome').count(), 0, 'app mode removes the terminal bar')
  const appChrome = await page3.evaluate(() => ({
    controls: document.querySelectorAll('.window-controls .window-btn').length,
    handles: document.querySelectorAll('.resize-handle').length,
    maximized: document.documentElement.dataset.maximized
  }))
  assert.equal(appChrome.controls, 3, 'app header exposes the custom window controls')
  assert.equal(appChrome.handles, 8, 'app window exposes the resize handles')
  assert.equal(appChrome.maximized, 'false', 'app window starts unmaximized')
  await page3.screenshot({ path: path.join(artifacts, '24-terminal-app.png'), animations: 'disabled' })

  assert.deepEqual(consoleErrors, [], `renderer console errors: ${consoleErrors.join('\n')}`)

  console.log('✓ sectioned settings: appearance, behavior, providers, projects, access, skills, agents')
  console.log('✓ graphite default theme, accents, density and approval policy persist')
  console.log('✓ seasonal three-month activity heatmap and season paging')
  console.log('✓ streaming chat, diff approval, automatic task title and second opinion')
  console.log('✓ image generation, preview approval and saved PNG')
  console.log('✓ outside-folder grant, private session, manual compaction and encrypted API key reuse')
  console.log('✓ mini terminal window type, compact overlays, window controls and resize handles')
  console.log(`Screenshots saved to ${artifacts}`)
} catch (error) {
  console.error('UI smoke test failed:', error)
  process.exitCode = 1
} finally {
  if (app) await app.close().catch(() => undefined)
  server.close()
  fs.rmSync(projectDir, { recursive: true, force: true })
  fs.rmSync(userData, { recursive: true, force: true })
  fs.rmSync(outsideFile, { force: true })
}
