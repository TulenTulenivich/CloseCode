import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode
} from 'react'
import type { EffortLevel } from '../../../shared/types'
import { effortScaleFor, supportsEffort } from '../../../shared/modelNames'
import { useT } from '../i18n'
import { CheckIcon, ChevronDownIcon } from './Icons'

interface EffortPickerProps {
  value: EffortLevel
  model: string | null
  disabled?: boolean
  onChange: (level: EffortLevel) => void
}

export function EffortPicker({
  value,
  model,
  disabled,
  onChange
}: EffortPickerProps): ReactNode | null {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const scale = model ? effortScaleFor(model) : null
  const selected = scale && scale.levels.includes(value) ? value : (scale?.levels[0] ?? 'medium')
  const selectedIndex = scale ? Math.max(0, scale.levels.indexOf(selected)) : 0

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent): void => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (open) optionRefs.current[selectedIndex]?.focus()
  }, [open, selectedIndex])

  if (!model || !scale || !supportsEffort(model)) return null

  const finish = (): void => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  const commit = (level: EffortLevel): void => {
    onChange(level)
    finish()
  }

  const onListKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const last = scale.levels.length - 1
    let next = selectedIndex
    if (event.key === 'ArrowDown') next = Math.min(last, selectedIndex + 1)
    if (event.key === 'ArrowUp') next = Math.max(0, selectedIndex - 1)
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = last
    onChange(scale.levels[next])
    optionRefs.current[next]?.focus()
  }

  return (
    <div className="effort-picker" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`effort-btn${open ? ' open' : ''}`}
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t('c.thinkingEffort')}: ${selected}`}
        title={t('c.thinkingEffort')}
      >
        <span className="effort-btn-value">{selected}</span>
        <ChevronDownIcon size={12} className="chev" />
      </button>

      {open && (
        <div
          className="popover effort-popover"
          role="menu"
          aria-label={t('c.thinkingEffort')}
          onKeyDown={onListKeyDown}
        >
          <div className="effort-head">{t('c.thinkingEffort')}</div>
          <div className="effort-list">
            {scale.levels.map((level, index) => {
              const active = level === selected
              return (
                <button
                  key={level}
                  ref={(node) => {
                    optionRefs.current[index] = node
                  }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  tabIndex={active ? 0 : -1}
                  className={`effort-option${active ? ' selected' : ''}`}
                  disabled={disabled}
                  onClick={() => commit(level)}
                >
                  <span className="effort-option-name">{level}</span>
                  {active && <CheckIcon size={15} className="effort-check" />}
                </button>
              )
            })}
          </div>
          <div className="effort-foot">{t('c.effortInfo')}</div>
        </div>
      )}
    </div>
  )
}
