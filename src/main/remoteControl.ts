import http from 'node:http'
import { EventEmitter } from 'node:events'
import type { AgentEvent } from '../shared/types'

export interface RemoteControlState {
  running: boolean
  port: number
  activeModel: string | null
  activeProject: string | null
  lastPrompt: string | null
}

class RemoteControlService extends EventEmitter {
  private server: http.Server | null = null
  private port = 4242
  private sseClients = new Set<http.ServerResponse>()
  private promptHandler: ((prompt: string) => Promise<void>) | null = null
  private stopHandler: (() => void) | null = null
  private stateProvider: (() => { activeModel: string | null; activeProject: string | null; running: boolean }) | null = null
  private historyProvider: (() => unknown[]) | null = null

  public setHandlers(handlers: {
    onPrompt: (prompt: string) => Promise<void>
    onStop: () => void
    getState: () => { activeModel: string | null; activeProject: string | null; running: boolean }
    getHistory: () => unknown[]
  }): void {
    this.promptHandler = handlers.onPrompt
    this.stopHandler = handlers.onStop
    this.stateProvider = handlers.getState
    this.historyProvider = handlers.getHistory
  }

  public broadcastEvent(event: AgentEvent): void {
    const data = `data: ${JSON.stringify(event)}\n\n`
    for (const client of this.sseClients) {
      try {
        client.write(data)
      } catch {
        this.sseClients.delete(client)
      }
    }
  }

  public start(port = 4242): Promise<number> {
    if (this.server) return Promise.resolve(this.port)
    this.port = port

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res))

      this.server.on('error', (err) => {
        this.server = null
        reject(err)
      })

      this.server.listen(this.port, '0.0.0.0', () => {
        resolve(this.port)
      })
    })
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      for (const client of this.sseClients) {
        try {
          client.end()
        } catch {
          // ignore
        }
      }
      this.sseClients.clear()

      if (!this.server) return resolve()
      this.server.close(() => {
        this.server = null
        resolve()
      })
    })
  }

  public isRunning(): boolean {
    return this.server !== null
  }

  public getPort(): number {
    return this.port
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

    if (url.pathname === '/api/status') {
      const state = this.stateProvider?.() ?? { activeModel: null, activeProject: null, running: false }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, remoteControl: true, port: this.port, ...state }))
      return
    }

    if (url.pathname === '/api/history') {
      const history = this.historyProvider?.() ?? []
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, history }))
      return
    }

    if (url.pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      })
      res.write(': connected\n\n')
      this.sseClients.add(res)
      req.on('close', () => this.sseClients.delete(res))
      return
    }

    if (url.pathname === '/api/stop' && req.method === 'POST') {
      this.stopHandler?.()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, stopped: true }))
      return
    }

    if (url.pathname === '/api/prompt' && req.method === 'POST') {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body || '{}') as { prompt?: string }
          if (!parsed.prompt) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'Missing prompt' }))
            return
          }
          if (this.promptHandler) {
            void this.promptHandler(parsed.prompt)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true, status: 'dispatched' }))
          } else {
            res.writeHead(503, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'Agent not ready' }))
          }
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }))
        }
      })
      return
    }

    // Default Web Dashboard
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(this.renderDashboard())
  }

  private renderDashboard(): string {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CloseCode · Remote Control (Antigravity)</title>
  <style>
    :root {
      --bg: #090d16;
      --panel: #131b2e;
      --border: rgba(255,255,255,0.1);
      --accent: #10b981;
      --text: #f1f5f9;
      --muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); padding: 16px; min-height: 100vh; display: flex; flex-direction: column; }
    .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--border); margin-bottom: 16px; }
    .brand { font-size: 17px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .badge { font-size: 11px; padding: 3px 8px; border-radius: 999px; background: rgba(16,185,129,0.15); color: var(--accent); border: 1px solid rgba(16,185,129,0.3); font-weight: 600; }
    .log-container { flex: 1; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 14px; overflow-y: auto; font-family: monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap; margin-bottom: 16px; min-height: 260px; max-height: 60vh; }
    .prompt-box { display: flex; gap: 8px; }
    input { flex: 1; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; color: var(--text); padding: 12px 14px; font-size: 14px; outline: none; }
    input:focus { border-color: var(--accent); }
    button { background: var(--accent); color: #000; border: none; border-radius: 10px; font-weight: 700; padding: 12px 20px; cursor: pointer; }
    button.stop { background: #ef4444; color: #fff; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <span>⚡ CloseCode Remote</span>
      <span class="badge" id="statusBadge">Онлайн</span>
    </div>
    <button class="stop" id="stopBtn" onclick="stopRun()">Стоп</button>
  </div>
  <div class="log-container" id="logs">Готов к приёму команд...</div>
  <div class="prompt-box">
    <input type="text" id="promptInput" placeholder="Введите задачу для агента..." onkeydown="if(event.key==='Enter') sendPrompt()">
    <button onclick="sendPrompt()">Отправить</button>
  </div>
  <script>
    const logs = document.getElementById('logs');
    const input = document.getElementById('promptInput');
    function appendLog(text) { logs.textContent += text; logs.scrollTop = logs.scrollHeight; }
    async function sendPrompt() {
      const prompt = input.value.trim();
      if (!prompt) return;
      input.value = '';
      appendLog('\\n> ' + prompt + '\\n');
      await fetch('/api/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
    }
    async function stopRun() {
      await fetch('/api/stop', { method: 'POST' });
      appendLog('\\n[Остановлено пользователем]\\n');
    }
    const es = new EventSource('/api/events');
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.type === 'text-delta') appendLog(ev.text);
      } catch {}
    };
  </script>
</body>
</html>`
  }
}

export const remoteControl = new RemoteControlService()
