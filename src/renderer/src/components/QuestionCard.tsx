import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { UserQuestion } from '../../../shared/types'
import { useT } from '../i18n'
import { SendIcon, SparkIcon, XIcon } from './Icons'

interface QuestionCardProps {
  question: UserQuestion
  onAnswer: (answer: string) => void
}

export function QuestionCard({ question, onAnswer }: QuestionCardProps): ReactNode {
  const { t } = useT()
  const [draft, setDraft] = useState('')

  useEffect(() => {
    setDraft('')
  }, [question.id])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onAnswer('')
        return
      }
      const index = Number(event.key) - 1
      if (!Number.isInteger(index) || index < 0 || index >= question.options.length) return
      const target = event.target as HTMLElement | null
      if (target instanceof HTMLInputElement) return
      event.preventDefault()
      onAnswer(question.options[index])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onAnswer, question])

  function submit(event: FormEvent): void {
    event.preventDefault()
    const value = draft.trim()
    if (value) onAnswer(value)
  }

  return (
    <aside className="ask" role="group" aria-label={t('q.title')}>
      <header className="ask-head">
        <span className="ask-mark">
          <SparkIcon size={14} />
        </span>
        <span className="ask-title">{t('q.title')}</span>
        <button
          type="button"
          className="icon-btn ask-close"
          title={t('q.skip')}
          aria-label={t('q.skip')}
          onClick={() => onAnswer('')}
        >
          <XIcon size={14} />
        </button>
      </header>

      <p className="ask-question">{question.question}</p>
      {question.hint && <p className="ask-hint">{question.hint}</p>}

      {question.options.length > 0 && (
        <div className="ask-options">
          {question.options.map((option, index) => (
            <button
              type="button"
              className="ask-option"
              key={`${option}-${index}`}
              onClick={() => onAnswer(option)}
            >
              <kbd>{index + 1}</kbd>
              <span>{option}</span>
            </button>
          ))}
        </div>
      )}

      <form className="ask-reply" onSubmit={submit}>
        <input
          className="ask-input"
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t('q.otherPh')}
          aria-label={t('q.other')}
          maxLength={600}
          autoFocus
        />
        <button type="submit" className="primary-btn ask-send" disabled={!draft.trim()}>
          <SendIcon size={14} />
          {t('q.send')}
        </button>
      </form>

      <p className="ask-foot">{t('q.foot')}</p>
    </aside>
  )
}
