import { useEffect, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import type { WindowBounds, WindowState } from '../../../shared/types'
import { useT } from '../i18n'
import { MaximizeIcon, MinimizeIcon, RestoreIcon, XIcon } from './Icons'

const DIRECTIONS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const

export function WindowControls(): ReactNode {
  const { t } = useT()
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    let alive = true
    const sync = (state: WindowState): void => {
      if (!alive) return
      setMaximized(state.maximized || state.fullscreen)
    }
    window.closecode
      .getWindowState()
      .then(sync)
      .catch(() => undefined)
    const unsubscribe = window.closecode.onWindowState(sync)
    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.maximized = maximized ? 'true' : 'false'
  }, [maximized])

  return (
    <div className="window-controls">
      <button
        type="button"
        className="window-btn"
        aria-label={t('chrome.minimize')}
        title={t('chrome.minimize')}
        onClick={() => window.closecode.minimizeWindow()}
      >
        <MinimizeIcon size={12} />
      </button>
      <button
        type="button"
        className="window-btn"
        aria-label={maximized ? t('chrome.restore') : t('chrome.maximize')}
        title={maximized ? t('chrome.restore') : t('chrome.maximize')}
        onClick={() => {
          window.closecode
            .toggleMaximizeWindow()
            .then((state) => setMaximized(state.maximized || state.fullscreen))
            .catch(() => undefined)
        }}
      >
        {maximized ? <RestoreIcon size={12} /> : <MaximizeIcon size={12} />}
      </button>
      <button
        type="button"
        className="window-btn close"
        aria-label={t('chrome.close')}
        title={t('chrome.close')}
        onClick={() => window.closecode.closeWindow()}
      >
        <XIcon size={13} />
      </button>
    </div>
  )
}

export function WindowResizeHandles(): ReactNode {
  function start(event: ReactPointerEvent<HTMLElement>, direction: (typeof DIRECTIONS)[number]): void {
    if (event.button !== 0) return
    event.preventDefault()
    const handle = event.currentTarget
    handle.setPointerCapture(event.pointerId)
    const startX = event.screenX
    const startY = event.screenY
    const terminal = document.documentElement.dataset.mode === 'terminal'
    const minWidth = terminal ? 460 : 900
    const minHeight = terminal ? 320 : 620
    let frame = 0
    let pending: WindowBounds | null = null
    let startBounds: WindowBounds | null = null

    const flush = (): void => {
      frame = 0
      if (!pending) return
      window.closecode.resizeWindow(pending)
      pending = null
    }

    const move = (moveEvent: PointerEvent): void => {
      if (!startBounds) return
      const dx = moveEvent.screenX - startX
      const dy = moveEvent.screenY - startY
      let { x, y, width, height } = startBounds
      if (direction.includes('e')) width = startBounds.width + dx
      if (direction.includes('s')) height = startBounds.height + dy
      if (direction.includes('w')) {
        width = startBounds.width - dx
        x = startBounds.x + dx
      }
      if (direction.includes('n')) {
        height = startBounds.height - dy
        y = startBounds.y + dy
      }
      if (width < minWidth) {
        if (direction.includes('w')) x = startBounds.x + startBounds.width - minWidth
        width = minWidth
      }
      if (height < minHeight) {
        if (direction.includes('n')) y = startBounds.y + startBounds.height - minHeight
        height = minHeight
      }
      pending = { x, y, width, height }
      if (!frame) frame = window.requestAnimationFrame(flush)
    }

    const finish = (): void => {
      if (frame) {
        window.cancelAnimationFrame(frame)
        frame = 0
      }
      flush()
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', finish)
      handle.removeEventListener('pointercancel', finish)
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId)
    }

    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', finish)
    handle.addEventListener('pointercancel', finish)
    window.closecode
      .getWindowBounds()
      .then((bounds) => {
        startBounds = bounds
      })
      .catch(() => undefined)
  }

  return (
    <div className="resize-layer" aria-hidden="true">
      {DIRECTIONS.map((direction) => (
        <span
          key={direction}
          className={`resize-handle ${direction}`}
          onPointerDown={(event) => start(event, direction)}
        />
      ))}
    </div>
  )
}
