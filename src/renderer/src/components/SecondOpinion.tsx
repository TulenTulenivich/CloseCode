import { useEffect, type ReactNode } from 'react'
import type { SecondOpinionResult } from '../../../shared/types'
import { useT } from '../i18n'
import { Markdown } from './Markdown'
import { AlertIcon, SparkIcon, XIcon } from './Icons'

export interface OpinionState {
  loading: boolean
  result?: SecondOpinionResult
  error?: string
}

interface SecondOpinionProps {
  state: OpinionState
  onClose: () => void
}

export function SecondOpinion({ state, onClose }: SecondOpinionProps): ReactNode {
  const { t } = useT()

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay opinion-overlay" onClick={onClose}>
      <div
        className="opinion-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t('run.opinionTitle')}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="opinion-head">
          <span className="opinion-icon">
            <SparkIcon size={16} />
          </span>
          <div className="opinion-title">
            <strong>{t('run.opinionTitle')}</strong>
            <small>
              {state.result
                ? t('run.opinionFrom', {
                    model: state.result.model,
                    provider: state.result.providerLabel
                  })
                : t('run.opinionHint')}
            </small>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label={t('run.opinionClose')}
            title={t('run.opinionClose')}
          >
            <XIcon size={15} />
          </button>
        </header>

        <div className="opinion-body">
          {state.loading && (
            <div className="opinion-loading" role="status">
              <span className="spinner" />
              <span>{t('run.opinionLoading')}</span>
            </div>
          )}
          {state.error && (
            <div className="opinion-error">
              <AlertIcon size={15} />
              <span>{state.error}</span>
            </div>
          )}
          {state.result && <Markdown>{state.result.text}</Markdown>}
        </div>
      </div>
    </div>
  )
}
