import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { ModelLoad } from '../../../shared/types'
import { useT } from '../i18n'
import { ProviderLogo } from './ProviderLogo'
import { ActivityIcon } from './Icons'

interface ModelLoadMeterProps {
  load: ModelLoad | null
}

function rate(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return value >= 100 ? String(Math.round(value)) : value.toFixed(1)
}

function millis(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${Math.round(value)} ms`
}

export function ModelLoadMeter({ load }: ModelLoadMeterProps): ReactNode {
  const { t, tc } = useT()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const active = Boolean(load?.inflight)

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

  const tokensPerSecond = load?.tokensPerSecond ?? load?.avgTokensPerSecond ?? null
  const firstToken = load?.firstTokenMs ?? load?.avgFirstTokenMs ?? null

  return (
    <div className="load-meter" ref={wrapRef}>
      <button
        type="button"
        className={`load-btn${active ? ' live' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={t('load.title')}
        title={
          load
            ? active
              ? `${t('load.working')} · ${t('load.tps', { n: rate(tokensPerSecond) })}`
              : t('load.idle')
            : t('load.title')
        }
      >
        <ActivityIcon size={12} />
        <span className="load-value">{t('load.tps', { n: rate(tokensPerSecond) })}</span>
        {(load?.inflight ?? 0) > 1 && (
          <span className="load-inflight" title={t('load.inflight', { n: load?.inflight ?? 0 })}>
            {load?.inflight}
          </span>
        )}
      </button>

      {open && (
        <div className="popover load-popover" role="dialog" aria-label={t('load.title')}>
          <div className="popover-head">
            <div>
              <strong>{t('load.title')}</strong>
              <small>{active ? t('load.working') : t('load.idle')}</small>
            </div>
            {load && <ProviderLogo brand={load.activeBrand} size={24} />}
          </div>

          <div className="load-numbers">
            <div>
              <strong>{t('load.tps', { n: rate(tokensPerSecond) })}</strong>
              <small>{t('load.tps', { n: rate(load?.avgTokensPerSecond ?? null) })}</small>
            </div>
            <div>
              <strong>{millis(firstToken)}</strong>
              <small>{t('load.first', { n: millis(load?.avgFirstTokenMs ?? null) })}</small>
            </div>
            <div>
              <strong>{load?.inflight ?? 0}</strong>
              <small>{tc('load.requests', load?.requests ?? 0)}</small>
            </div>
          </div>

          {load && active && (
            <div className="load-live">
              <span>{millis(load.elapsedMs)}</span>
              <span>{tc('load.chars', load.outputChars)}</span>
            </div>
          )}

          <p className="load-desc">{t('load.desc')}</p>
        </div>
      )}
    </div>
  )
}
