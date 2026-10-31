import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useT } from '../i18n'
import { RefreshIcon, TrashIcon, XIcon } from './Icons'

interface TerminalViewProps {
  active: boolean
  cwd?: string | null
  onClose?: () => void
  compact?: boolean
}

type ShellStatus = 'starting' | 'running' | 'exited'

function readTheme(): Record<string, string> {
  const root = getComputedStyle(document.documentElement)
  const value = (name: string, fallback: string): string => root.getPropertyValue(name).trim() || fallback
  const light = document.documentElement.dataset.theme === 'light'
  return {
    background: value('--bg', light ? '#f7f7f3' : '#1e1f22'),
    foreground: value('--text', light ? '#24241f' : '#e9e9e4'),
    cursor: value('--accent', '#b9e86b'),
    cursorAccent: value('--bg', '#1e1f22'),
    selectionBackground: light ? 'rgba(60, 90, 30, 0.2)' : 'rgba(185, 232, 107, 0.24)',
    black: light ? '#2a2a26' : '#2a2b2f',
    red: value('--red', '#f29185'),
    green: value('--green', '#7fd8a4'),
    yellow: value('--yellow', '#e8c479'),
    blue: light ? '#3d6fa8' : '#7fb8ff',
    magenta: light ? '#8a5bb0' : '#c9a1ff',
    cyan: light ? '#2f7f83' : '#76d7d1',
    white: value('--text', '#e9e9e4'),
    brightBlack: value('--muted-2', '#70706b'),
    brightRed: value('--red', '#f29185'),
    brightGreen: value('--green', '#7fd8a4'),
    brightYellow: value('--yellow', '#e8c479'),
    brightBlue: light ? '#5b8bc4' : '#a8d0ff',
    brightMagenta: light ? '#a06bc9' : '#e0c4ff',
    brightCyan: light ? '#3a9a9e' : '#a3ece8',
    brightWhite: value('--text-strong', '#f7f7f2')
  }
}

/** A real ConPTY-backed PowerShell rendered by xterm.js. */
export function TerminalView({
  active,
  cwd,
  onClose,
  compact
}: TerminalViewProps): ReactNode {
  const { t } = useT()
  const hostRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const sessionRef = useRef<string | null>(null)
  const aliveRef = useRef(true)
  const [status, setStatus] = useState<ShellStatus>('starting')
  const [shellName, setShellName] = useState('shell')
  const [shellCwd, setShellCwd] = useState(cwd ?? '')
  const [generation, setGeneration] = useState(0)

  const fit = useCallback((): void => {
    const term = termRef.current
    const fitAddon = fitRef.current
    const host = hostRef.current
    if (!term || !fitAddon || !host || !active) return
    if (!host.clientWidth || !host.clientHeight) return
    try {
      fitAddon.fit()
    } catch {
      // The host may be between layout passes.
    }
  }, [active])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    aliveRef.current = true
    const term = new Terminal({
      allowTransparency: false,
      cursorBlink: true,
      cursorStyle: 'bar',
      fontFamily: "'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
      fontSize: compact ? 12 : 13,
      lineHeight: 1.22,
      scrollback: 8000,
      theme: readTheme()
    })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(host)
    termRef.current = term
    fitRef.current = fitAddon

    const offData = window.closecode.onTerminalData((event) => {
      if (event.id !== sessionRef.current) return
      term.write(event.data)
    })
    const offExit = window.closecode.onTerminalExit((event) => {
      if (event.id !== sessionRef.current) return
      sessionRef.current = null
      setStatus('exited')
    })
    const input = term.onData((data) => {
      const id = sessionRef.current
      if (id) window.closecode.writeTerminal(id, data)
    })
    const resized = term.onResize(({ cols, rows }) => {
      const id = sessionRef.current
      if (id) window.closecode.resizeTerminal(id, cols, rows)
    })

    let bootTimer: number | null = null
    const boot = (): void => {
      if (!aliveRef.current) return
      try {
        fitAddon.fit()
      } catch {
        // Ignore a zero-sized host.
      }
      setStatus('starting')
      sessionRef.current = null
      window.closecode
        .startTerminal({ cols: term.cols, rows: term.rows })
        .then((session) => {
          if (!aliveRef.current) {
            window.closecode.stopTerminal(session.id)
            return
          }
          sessionRef.current = session.id
          setShellName(session.shell)
          setShellCwd(session.cwd)
          setStatus('running')
          term.focus()
        })
        .catch(() => {
          if (aliveRef.current) setStatus('exited')
        })
    }

    bootTimer = window.setTimeout(boot, 40)
    const observer = new ResizeObserver(() => fit())
    observer.observe(host)

    return () => {
      aliveRef.current = false
      if (bootTimer) window.clearTimeout(bootTimer)
      observer.disconnect()
      offData()
      offExit()
      input.dispose()
      resized.dispose()
      const id = sessionRef.current
      sessionRef.current = null
      if (id) window.closecode.stopTerminal(id)
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
    // The session lives for the lifetime of the view; active only gates fitting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generation])

  useEffect(() => {
    if (!active) return
    const frame = requestAnimationFrame(() => {
      fit()
      termRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [active, fit])

  useEffect(() => {
    const update = (): void => {
      if (termRef.current) termRef.current.options.theme = readTheme()
    }
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  function restart(): void {
    const term = termRef.current
    term?.reset()
    setGeneration((value) => value + 1)
  }

  function clear(): void {
    termRef.current?.clear()
    termRef.current?.focus()
  }

  return (
    <div className={`shell-view${compact ? ' compact' : ''}`}>
      <div className="shell-toolbar">
        <span className={`shell-status-dot ${status}`} aria-hidden="true" />
        <span className="shell-name">{shellName}</span>
        <span className="shell-cwd" title={shellCwd}>
          {shellCwd}
        </span>
        <span className="shell-spacer" />
        <button
          type="button"
          className="shell-tool"
          onClick={restart}
          title={t('term.shellRestart')}
          aria-label={t('term.shellRestart')}
        >
          <RefreshIcon size={13} />
        </button>
        <button
          type="button"
          className="shell-tool"
          onClick={clear}
          title={t('term.shellClear')}
          aria-label={t('term.shellClear')}
        >
          <TrashIcon size={13} />
        </button>
        {onClose && (
          <button
            type="button"
            className="shell-tool"
            onClick={onClose}
            title={t('chrome.close')}
            aria-label={t('chrome.close')}
          >
            <XIcon size={13} />
          </button>
        )}
      </div>
      <div className="shell-body">
        <div className="shell-host" ref={hostRef} />
        {status !== 'running' && (
          <div className="shell-overlay">
            {status === 'starting' ? (
              <>
                <span className="spinner" />
                <span>{t('term.shellStarting')}</span>
              </>
            ) : (
              <>
                <span>{t('term.shellExited')}</span>
                <button type="button" className="shell-restart-btn" onClick={restart}>
                  {t('term.shellRestart')}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
