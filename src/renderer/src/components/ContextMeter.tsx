import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { ContextState } from '../../../shared/types'
import { formatTokens } from '../utils'
import { useT } from '../i18n'
import { CompressIcon } from './Icons'

interface ContextMeterProps {
  context: ContextState | null
  streaming: boolean
  compacting: boolean
  canCompact: boolean
  onCompact: () => void
}

const FALLBACK_LIMIT = 128000

export function ContextMeter({
  context,
  streaming,
  compacting,
  canCompact,
  onCompact
}: ContextMeterProps): ReactNode {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent): void => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const limit = context?.limit ?? FALLBACK_LIMIT
  const used = Math.min(context?.used ?? 0, limit)
  const remaining = Math.max(0, limit - used)
  const threshold = context?.threshold ?? 0.85
  const percentValue = limit > 0 ? (used / limit) * 100 : 0
  const percent = Math.max(0, Math.min(100, Math.round(percentValue)))
  const tone =
    percentValue >= threshold * 100 ? 'critical' : percentValue >= 65 ? 'warn' : 'calm'
  const title = context
    ? t('ctx.button', {
        left: formatTokens(remaining),
        limit: formatTokens(limit),
        threshold: Math.round(threshold * 100)
      })
    : t('ctx.loading')

  return (
    <div className="context-meter" ref={wrapRef}>
      <button
        type="button"
        className={`context-btn ${tone}${compacting ? ' busy' : ''}`}
        onClick={() => setOpen((value) => !value)}
        disabled={!context}
        aria-label={title}
        aria-expanded={open}
        title={title}
      >
        <span className={`context-track ${tone}`} aria-hidden="true">
          <span className="context-fill" style={{ width: `${percent}%` }} />
        </span>
        <span className="context-percent">{compacting ? '…' : `${percent}%`}</span>
      </button>

      {open && context && (
        <div className="popover context-popover" role="dialog" aria-label={t('ctx.title')}>
          <div className="popover-head context-head">
            <div>
              <strong>{t('ctx.title')}</strong>
              <small>{t('ctx.sub')}</small>
            </div>
            <span className={`context-badge ${tone}`}>{percent}%</span>
          </div>

          <p className="context-desc">
            {t('ctx.desc', { threshold: Math.round(threshold * 100) })}
          </p>

          <div className={`context-progress ${tone}`}>
            <span style={{ width: `${percent}%` }} />
          </div>

          <div className="context-numbers">
            <div>
              <strong>{formatTokens(used)}</strong>
              <small>{t('ctx.used')}</small>
            </div>
            <div>
              <strong>{formatTokens(remaining)}</strong>
              <small>{t('ctx.left')}</small>
            </div>
            <div>
              <strong>{formatTokens(limit)}</strong>
              <small>{t('ctx.limit')}</small>
            </div>
          </div>

          <button
            type="button"
            className="context-compact-btn"
            onClick={() => {
              setOpen(false)
              onCompact()
            }}
            disabled={streaming || compacting || !canCompact}
          >
            {compacting ? <span className="spinner" /> : <CompressIcon size={14} />}
            {compacting ? t('ctx.compacting') : t('ctx.compactNow')}
          </button>
        </div>
      )}
    </div>
  )
}
